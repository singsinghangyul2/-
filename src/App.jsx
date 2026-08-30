import { useState, useEffect } from 'react'
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import './App.css'

const firebaseConfig = {
  apiKey: "AIzaSyDyrfuOttJHRI-8BgQvpIlnJtEsbIAW7jo",
  authDomain: "couple-diet-1012.firebaseapp.com",
  projectId: "couple-diet-1012",
  storageBucket: "couple-diet-1012.firebasestorage.app",
  messagingSenderId: "487330133450",
  appId: "1:487330133450:web:e03a5c60538ebcb9964b33"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 한국 시간 기준 오늘 날짜 구하기 (YYYY-MM-DD)
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 주간 시작일(월요일)과 종료일(일요일) 구하기
const getWeekRange = (dateStr) => {
  const curr = new Date(dateStr);
  const day = curr.getDay();
  const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diffToMonday));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (d) => {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${dayOfMonth}`;
  };

  return { start: formatDate(monday), end: formatDate(sunday) };
};

export default function App() {
  // 인증 관련 상태
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [currentTab, setCurrentTab] = useState('home'); // home, calendar, record, stats, settings
  const todayStr = getTodayStr();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // 커플 ID 고정 (두 사람이 공유할 커플 룸 ID)
  const coupleId = 'couple-1012';
  const currentUser = {
    name: user?.displayName || user?.email?.split('@')[0] || '사용자',
    email: user?.email || '',
    coupleId: coupleId
  };
  const partnerEmail = currentUser.email === 'ysh94335@gmail.com' ? 'sang5ny@gmail.com' : 'ysh94335@gmail.com';
  const partnerName = currentUser.email === 'ysh94335@gmail.com' ? '상오니' : '승현';

  // 푸켓 여행일 설정 (기본 D-Day 계산용)
  const travelDate = '2026-12-31';
  const calculateDday = (tDate) => {
    const diff = new Date(tDate) - new Date(todayStr);
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 ? `D-${days}` : '여행 완료 🎉';
  };

  // 선택된 날짜의 상세 데이터 상태
  const [dietStatus, setDietStatus] = useState('미입력'); // 성공, 실패, 야자수 데이, 미입력
  const [workouts, setWorkouts] = useState([]); // 오늘 운동 목록
  const [monthDataCache, setMonthDataCache] = useState({});
  const [fines, setFines] = useState([]); // 벌금 목록
  const [showCelebration, setShowCelebration] = useState(false); // 축하 모달

  // 달력 뷰 상태
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Firebase 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 로그인 처리
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
    } catch (err) {
      setAuthError("로그인 실패: 이메일이나 비밀번호를 확인해주세요.");
    }
  };

  // 회원가입 처리
  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
      alert("회원가입이 완료되었습니다! 환영합니다 🌴");
    } catch (err) {
      setAuthError("회원가입 실패: " + err.message);
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    await signOut(auth);
  };

  // 1. 선택된 날짜의 상세 데이터 및 벌금 목록 불러오기
  useEffect(() => {
    if (!user) return;
    async function fetchDailyData() {
      try {
        const dietRef = doc(db, "CoupleDiets", `${coupleId}_${selectedDate}_${user.email}`);
        const dietSnap = await getDoc(dietRef);
        if (dietSnap.exists()) {
          setDietStatus(dietSnap.data().status || '미입력');
        } else {
          setDietStatus('미입력');
        }

        const workoutQuery = query(collection(db, "CoupleWorkouts"), where("coupleId", "==", coupleId), where("ownerEmail", "==", user.email), where("targetDate", "==", selectedDate));
        const workoutSnap = await getDocs(workoutQuery);
        const loadedWorkouts = [];
        workoutSnap.forEach(doc => loadedWorkouts.push({ id: doc.id, ...doc.data() }));
        setWorkouts(loadedWorkouts);

        const fineQuery = query(collection(db, "CouplePenalties"), where("coupleId", "==", coupleId));
        const fineSnap = await getDocs(fineQuery);
        const loadedFines = [];
        fineSnap.forEach(doc => loadedFines.push({ id: doc.id, ...doc.data() }));
        setFines(loadedFines);

      } catch (err) {
        console.error("데이터 로딩 실패:", err);
      }
    }
    fetchDailyData();
  }, [selectedDate, user]);

  // 2. 월간 캘린더 데이터 캐싱
  useEffect(() => {
    if (!user) return;
    async function fetchMonthData() {
      try {
        const year = currentYearMonth.year;
        const month = currentYearMonth.month;
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const cache = {};

        for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dayStr = String(d.getDate()).padStart(2, '0');
          const dateString = `${d.getFullYear()}-${m}-${dayStr}`;

          const docRef = doc(db, "CoupleDiets", `${coupleId}_${dateString}_${user.email}`);
          const docSnap = await getDoc(docRef);
          cache[dateString] = docSnap.exists() ? docSnap.data().status : '미입력';
        }
        setMonthDataCache(cache);
      } catch (err) {
        console.error("월간 데이터 로딩 실패:", err);
      }
    }
    fetchMonthData();
  }, [currentYearMonth, user]);

  // 마감 규칙 체크
  const checkIfLocked = (targetDateStr) => {
    const target = new Date(targetDateStr);
    const deadline = new Date(target.setDate(target.getDate() + 2)); 
    return new Date() > deadline;
  };
  const isLocked = checkIfLocked(selectedDate);

  // 식단 상태 변경 및 자동 벌금 생성
  const handleDietChange = async (newStatus) => {
    if (isLocked) {
      alert("마감된 기록은 수정할 수 없습니다! 🔒");
      return;
    }
    setDietStatus(newStatus);
    try {
      const docId = `${coupleId}_${selectedDate}_${user.email}`;
      await setDoc(doc(db, "CoupleDiets", docId), {
        coupleId: coupleId,
        ownerEmail: user.email,
        targetDate: selectedDate,
        status: newStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (newStatus === '실패') {
        const penaltyKey = `${user.email}_${selectedDate}_Diet`;
        await setDoc(doc(db, "CouplePenalties", penaltyKey), {
          coupleId: coupleId,
          ownerEmail: user.email,
          penaltyType: 'Diet',
          referenceDate: selectedDate,
          amount: 10000,
          reason: '식단 미션 실패',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("식단 저장 실패:", err);
    }
  };

  // 운동 추가
  const handleAddWorkout = async () => {
    if (isLocked) {
      alert("마감된 날짜에는 운동을 추가할 수 없습니다! 🔒");
      return;
    }
    try {
      await addDoc(collection(db, "CoupleWorkouts"), {
        coupleId: coupleId,
        ownerEmail: user.email,
        targetDate: selectedDate,
        exerciseType: '헬스/피트니스',
        durationMinutes: 60,
        completed: true,
        createdAt: new Date().toISOString()
      });
      setWorkouts(prev => [...prev, { exerciseType: '헬스/피트니스', completed: true }]);
      alert("운동 인증 완료! 🏋️‍♀️");
    } catch (err) {
      console.error("운동 추가 실패:", err);
    }
  };

  // 콕 찌르기 전송
  const sendPoke = async (missionType) => {
    try {
      await addDoc(collection(db, "CouplePokes"), {
        coupleId: coupleId,
        senderEmail: user.email,
        receiverEmail: partnerEmail,
        missionType,
        message: `${currentUser.name}님이 오늘의 ${missionType === 'Diet' ? '식단' : '운동'} 미션을 콕 찔렀어요! 👈`,
        sentAt: new Date().toISOString(),
        isRead: false
      });
      alert(`상대방(${partnerName})에게 콕 찌르기 알림을 보냈습니다! 🌴`);
    } catch (err) {
      console.error("콕 찌르기 실패:", err);
    }
  };

  // 로딩 중 화면
  if (authLoading) {
    return <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>로딩 중입니다... 🌴</div>;
  }

  // 로그인되지 않은 경우 로그인/회원가입 화면 출력
  if (!user) {
    return (
      <div style={{ maxWidth: '480px', margin: '0 auto', background: '#f4fcfc', minHeight: '100vh', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ background: '#fff', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '2px solid #20b2aa' }}>
          <h1 style={{ fontSize: '20px', color: '#008080', textAlign: 'center', marginBottom: '8px' }}>🌴 푸켓행 바디 챌린지 🍍</h1>
          <p style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginBottom: '20px' }}>커플 미션 시작을 위해 로그인해 주세요!</p>

          {authError && <div style={{ background: '#ffebee', color: '#c62828', padding: '8px', borderRadius: '8px', fontSize: '11px', marginBottom: '12px', textAlign: 'center' }}>{authError}</div>}

          <form onSubmit={isSignUpMode ? handleSignUp : handleLogin}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>이메일 주소</label>
              <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} required placeholder="example@couple.com" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>비밀번호</label>
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} required placeholder="비밀번호 입력" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>

            <button type="submit" style={{ width: '100%', background: '#008080', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', marginBottom: '10px' }}>
              {isSignUpMode ? '회원가입하기 ✨' : '로그인하기 🚀'}
            </button>
          </form>

          <button onClick={() => { setIsSignUpMode(!isSignUpMode); setAuthError(''); }} style={{ width: '100%', background: 'none', border: 'none', color: '#ff7f50', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
            {isSignUpMode ? '이미 계정이 있으신가요? 로그인하기' : '계정이 없으신가요? 회원가입하기'}
          </button>
        </div>
      </div>
    );
  }

  const year = currentYearMonth.year;
  const month = currentYearMonth.month;
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', background: '#f4fcfc', minHeight: '100vh', paddingBottom: '80px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', color: '#333' }}>
      
      {/* 🌊 헤더 타이틀 */}
      <div style={{ background: 'linear-gradient(135deg, #008080 0%, #20b2aa 100%)', color: '#fff', padding: '18px', textAlign: 'center', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '19px', margin: '0 0 4px 0', fontWeight: 'bold' }}>🌴 푸켓행 바디 챌린지 🍍</h1>
        <p style={{ fontSize: '12px', margin: 0, opacity: 0.9 }}>접속 계정: <b>{currentUser.name}</b>님 ({currentUser.email})</p>
      </div>

      <div style={{ padding: '16px' }}>

        {/* 1. 홈 화면 탭 */}
        {currentTab === 'home' && (
          <div>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', textAlign: 'center', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '2px solid #ff7f50' }}>
              <span style={{ background: '#ff7f50', color: '#fff', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>푸켓 여행 D-Day</span>
              <h2 style={{ fontSize: '26px', color: '#008080', margin: '8px 0 4px 0', fontWeight: '800' }}>{calculateDday(travelDate)}</h2>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>야자수 아래의 우리를 상상하며 오늘도 파이팅! 💪</p>
            </div>

            <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#008080' }}>👤 {currentUser.name}의 오늘 미션</span>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: isLocked ? '#666' : '#20b2aa', color: '#fff', fontWeight: 'bold' }}>
                  {isLocked ? '마감 완료 🔒' : '수정 가능 ✨'}
                </span>
              </div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>🥗 오늘 식단: <b>{dietStatus}</b> {dietStatus === '야자수 데이' && '🌴'}</div>
                <div>🏋️ 오늘 운동 기록: <b>{workouts.length}회 완료</b></div>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#ff7f50', marginBottom: '10px' }}>💖 상대방 ({partnerName}) 응원하기</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => sendPoke('Diet')} style={{ flex: 1, background: '#fff8dc', border: '1px solid #ff7f50', padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>🥗 식단 콕 찌르기</button>
                <button onClick={() => sendPoke('Exercise')} style={{ flex: 1, background: '#e0ffff', border: '1px solid #20b2aa', padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>🏋️ 운동 콕 찌르기</button>
              </div>
            </div>

            <button onClick={() => setShowCelebration(true)} style={{ width: '100%', background: 'linear-gradient(135deg, #ff7f50 0%, #ffa07a 100%)', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', boxShadow: '0 3px 6px rgba(255,127,80,0.3)' }}>
              🎉 이번 주 공동 성공 축하 모달 열기
            </button>
          </div>
        )}

        {/* 2. 주간 캘린더 탭 */}
        {currentTab === 'calendar' && (
          <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button onClick={() => setCurrentYearMonth(p => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 })} style={{ background: '#eee', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>◀</button>
              <h3 style={{ fontSize: '14px', margin: 0, color: '#008080' }}>{currentYearMonth.year}년 {currentYearMonth.month + 1}월 캘린더</h3>
              <button onClick={() => setCurrentYearMonth(p => p.month === 11 ? { year: p.year + 1, month: 0 } : { ...p, month: p.month + 1 })} style={{ background: '#eee', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>▶</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '8px' }}>
              <div style={{ color: '#ff5252' }}>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div style={{ color: '#448aff' }}>토</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: totalDays }).map((_, i) => {
                const dayNum = i + 1;
                const mStr = String(currentYearMonth.month + 1).padStart(2, '0');
                const dStr = String(dayNum).padStart(2, '0');
                const dateKey = `${currentYearMonth.year}-${mStr}-${dStr}`;
                const status = monthDataCache[dateKey];
                const isSelected = selectedDate === dateKey;

                return (
                  <div
                    key={dateKey}
                    onClick={() => { setSelectedDate(dateKey); setCurrentTab('record'); }}
                    style={{
                      minHeight: '45px',
                      padding: '4px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #008080' : '1px solid #eee',
                      background: isSelected ? '#e0ffff' : '#fafafa',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      fontSize: '11px'
                    }}
                  >
                    <span style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>{dayNum}</span>
                    <span style={{ fontSize: '9px', textAlign: 'center' }}>
                      {status === '성공' ? '🟢' : status === '실패' ? '🔴' : status === '야자수 데이' ? '🌴' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. 기록 화면 탭 */}
        {currentTab === 'record' && (
          <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '15px', color: '#008080', marginTop: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📅 날짜별 기록 관리</span>
              <span style={{ fontSize: '11px', color: '#ff7f50', background: '#fff8dc', padding: '2px 6px', borderRadius: '4px' }}>{selectedDate}</span>
            </h3>
            
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>날짜 선택 (오늘 및 어제):</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
            </div>

            {/* 식단 상태 선택 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>🥗 식단 상태 선택</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['성공', '실패', '야자수 데이'].map((status) => (
                  <button
                    key={status}
                    disabled={isLocked}
                    onClick={() => handleDietChange(status)}
                    style={{
                      flex: 1,
                      padding: '10px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      background: dietStatus === status ? '#008080' : '#eee',
                      color: dietStatus === status ? '#fff' : '#333',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.6 : 1
                    }}
                  >
                    {status === '야자수 데이' ? '🌴 야자수' : status}
                  </button>
                ))}
              </div>
              {isLocked && <p style={{ color: '#ff5252', fontSize: '11px', marginTop: '4px' }}>🔒 마감된 기록은 변경할 수 없습니다.</p>}
            </div>

            {/* 운동 추가 버튼 */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>🏋️ 운동 기록 추가 (하루 최대 1회 인정)</label>
              <button 
                disabled={isLocked}
                onClick={handleAddWorkout}
                style={{ width: '100%', background: '#20b2aa', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', opacity: isLocked ? 0.6 : 1 }}
              >
                + 오늘 운동 1회 인증하기 ({workouts.length}회 완료)
              </button>
            </div>
          </div>
        )}

        {/* 4. 통계 화면 탭 */}
        {currentTab === 'stats' && (
          <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '15px', color: '#008080', marginTop: 0 }}>📊 월별 통계 및 벌금 현황</h3>
            <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '10px', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ff7f50', marginBottom: '4px' }}>🚨 누적 벌금 내역</div>
              {fines.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>아직 발생한 벌금이 없어요! 완벽합니다 👏</p>
              ) : (
                fines.map(f => (
                  <div key={f.id} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee' }}>
                    <span>{f.referenceDate} ({f.penaltyType})</span>
                    <span style={{ fontWeight: 'bold', color: '#e53935' }}>{f.amount.toLocaleString()}원</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 5. 설정 화면 탭 */}
        {currentTab === 'settings' && (
          <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '15px', color: '#008080', marginTop: 0 }}>⚙️ 앱 설정 및 계정 관리</h3>
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#555', marginBottom: '16px' }}>
              <div><b>현재 연결된 커플 ID:</b> {coupleId}</div>
              <div><b>내 이메일:</b> {user.email}</div>
              <div><b>푸켓 여행일:</b> {travelDate}</div>
            </div>
            <button onClick={handleLogout} style={{ width: '100%', background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
              로그아웃 🚪
            </button>
          </div>
        )}

      </div>

      {/* 🎉 축하 모달 */}
      {showCelebration && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '20px', textAlign: 'center', maxWidth: '320px', border: '4px solid #ff7f50' }}>
            <h2 style={{ fontSize: '20px', color: '#ff7f50', margin: '0 0 8px 0' }}>🎉 환상의 여행 메이트 달성! 🎉</h2>
            <p style={{ fontSize: '13px', color: '#555', margin: '0 0 16px 0' }}>두 사람 모두 이번 주 식단과 운동 미션을 완벽하게 성공했어요! 푸켓에 한 걸음 더 가까워졌습니다 🌴✨</p>
            <button onClick={() => setShowCelebration(false)} style={{ background: '#008080', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
              확인 🥳
            </button>
          </div>
        </div>
      )}

      {/* 🧭 하단 네비게이션 탭바 */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: '480px', margin: '0 auto', background: '#fff', display: 'flex', justifyContent: 'space-around', padding: '10px 0', borderTop: '1px solid #ddd', boxShadow: '0 -2px 8px rgba(0,0,0,0.03)', zIndex: 999 }}>
        {[
          { id: 'home', label: '🏠 홈' },
          { id: 'calendar', label: '📅 캘린더' },
          { id: 'record', label: '✍️ 기록' },
          { id: 'stats', label: '📊 통계' },
          { id: 'settings', label: '⚙️ 설정' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '11px',
              fontWeight: currentTab === tab.id ? 'bold' : 'normal',
              color: currentTab === tab.id ? '#008080' : '#888',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

    </div>
  );
}