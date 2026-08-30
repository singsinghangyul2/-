import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc, collection, addDoc, query, where, getDocs 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDyrfuOttJHRI-8BgQvpIlnJtEsbIAW7jo",
  authDomain: "couple-diet-1012.firebaseapp.com",
  projectId: "couple-diet-1012",
  storageBucket: "couple-diet-1012.firebasestorage.app",
  messagingSenderId: "487330133450",
  appId: "1:487330133450:web:e03a5c60538ebcb9964b33"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const sanitizeEmail = (email) => email ? email.trim().toLowerCase().replace(/\./g, '_') : '';

// 이번 주 월요일 날짜 구하기 (Asia/Seoul 기준)
const getMondayOfCurrentWeek = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const [pokeCount, setPokeCount] = useState(0);
  const [alertMessage, setAlertMessage] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const [targetDate, setTargetDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }));
  const [dietStatus, setDietStatus] = useState('성공'); 
  const [dietMemo, setDietMemo] = useState('');
  const [dietPhotoUrl, setDietPhotoUrl] = useState('');
  
  const [workoutType, setWorkoutType] = useState('헬스/피트니스');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [workoutMemo, setWorkoutMemo] = useState('');
  const [workoutCompleted, setWorkoutCompleted] = useState(true);

  const [myRecords, setMyRecords] = useState([]);
  const [partnerRecords, setPartnerRecords] = useState([]);
  const [penalties, setPenalties] = useState([]);

  // 주간 캘린더 상태 (기준 월요일)
  const [weekStartDate, setWeekStartDate] = useState(getMondayOfCurrentWeek());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    return () => unsubscribe();
  }, []);

  const userEmail = currentUser?.email ? currentUser.email.trim().toLowerCase() : '';
  const isSeungHyun = userEmail === 'ysh94335@gmail.com';
  const partnerEmail = isSeungHyun ? 'sang5ny@gmail.com' : 'ysh94335@gmail.com';
  const partnerName = isSeungHyun ? '상오니' : '승현';
  const myName = isSeungHyun ? '승현' : '상오니';

  const sanitizedMyEmailKey = sanitizeEmail(currentUser?.email);
  const sanitizedPartnerEmailKey = sanitizeEmail(partnerEmail);

  const calculateDday = () => {
    const target = new Date('2026-12-31T00:00:00+09:00');
    const todayStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
    const today = new Date(todayStr);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  useEffect(() => {
    if (!currentUser) return;
    const docRef = doc(db, 'challenges', 'couple_poke_data');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentMyPoke = data[sanitizedMyEmailKey] || 0;
        if (currentMyPoke > pokeCount && pokeCount !== 0) {
          setAlertMessage(`🚨 ${partnerName}님이 콕 찔렀어요! 오늘의 푸켓 미션을 확인해 보세요! 👉`);
          setTimeout(() => setAlertMessage(''), 5000);
        }
        setPokeCount(currentMyPoke);
      } else {
        setDoc(docRef, { [sanitizedMyEmailKey]: 0, [sanitizedPartnerEmailKey]: 0 });
      }
    }, (error) => console.error("Poke sync error:", error));

    return () => unsubscribe();
  }, [currentUser, sanitizedMyEmailKey, sanitizedPartnerEmailKey, pokeCount, partnerName]);

  // 기록 불러오기 및 마감 규칙 검증
  useEffect(() => {
    if (!currentUser) return;
    const fetchRecords = async () => {
      try {
        // 내 기록
        const myQ = query(collection(db, 'dietCheckins'), where('ownerEmail', '==', currentUser.email));
        const mySnap = await getDocs(myQ);
        const myList = [];
        mySnap.forEach((docSnap) => {
          const data = docSnap.data();
          const targetD = new Date(data.targetDate);
          const deadline = new Date(targetD.setDate(targetD.getDate() + 2));
          deadline.setHours(0, 0, 0, 0);
          
          const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
          if (now >= deadline && !data.isLocked) {
            const penaltyKey = `${currentUser.email}_${data.targetDate}_DIET`;
            if (data.status === '미입력' || data.status === '실패') {
              addDoc(collection(db, 'penalties'), {
                coupleId: 'couple_01',
                ownerEmail: currentUser.email,
                partnerEmail: partnerEmail,
                penaltyType: 'DIET',
                referenceDate: data.targetDate,
                amount: 10000,
                reason: `식단 마감 초과/실패 (${data.targetDate})`,
                uniquePenaltyKey: penaltyKey,
                createdAt: new Date().toISOString()
              }).catch(() => {});
            }
          }
          myList.push({ id: docSnap.id, ...data });
        });
        setMyRecords(myList);

        // 파트너 기록
        const partnerQ = query(collection(db, 'dietCheckins'), where('ownerEmail', '==', partnerEmail));
        const partnerSnap = await getDocs(partnerQ);
        const partnerList = [];
        partnerSnap.forEach((docSnap) => partnerList.push({ id: docSnap.id, ...docSnap.data() }));
        setPartnerRecords(partnerList);

        // 벌금 현황
        const pQuery = query(collection(db, 'penalties'), where('ownerEmail', '==', currentUser.email));
        const pSnapshot = await getDocs(pQuery);
        const pList = [];
        pSnapshot.forEach((docSnap) => pList.push(docSnap.data()));
        setPenalties(pList);
      } catch (e) {
        console.error("Fetch error:", e);
      }
    };
    fetchRecords();
  }, [currentUser, activeTab, partnerEmail]);

  const handlePoke = async () => {
    try {
      const docRef = doc(db, 'challenges', 'couple_poke_data');
      const snap = await getDoc(docRef);
      let currentVal = 0;
      if (snap.exists()) {
        currentVal = snap.data()[sanitizedPartnerEmailKey] || 0;
      }
      await setDoc(docRef, { [sanitizedPartnerEmailKey]: currentVal + 1 }, { merge: true });
      alert(`${partnerName}님을 성공적으로 콕 찔렀습니다! 👉`);
    } catch (error) {
      alert('오류 발생: ' + error.message);
    }
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { setDeferredPrompt(null); });
    } else {
      alert('브라우저 메뉴에서 [홈 화면에 추가] 또는 [앱 설치]를 선택해 주세요!');
    }
  };

  const handleSaveDiet = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'dietCheckins'), {
        coupleID: 'couple_01',
        ownerEmail: currentUser.email,
        partnerEmail: partnerEmail,
        targetDate: targetDate,
        status: dietStatus,
        memo: dietMemo,
        photoUrls: dietPhotoUrl ? [dietPhotoUrl] : [],
        isLocked: false,
        createdAt: new Date().toISOString()
      });
      alert('식단 기록이 안전하게 저장되었습니다! 🥗');
      setDietMemo('');
      setDietPhotoUrl('');
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  const handleSaveWorkout = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'exerciseLogs'), {
        coupleID: 'couple_01',
        ownerEmail: currentUser.email,
        partnerEmail: partnerEmail,
        targetDate: targetDate,
        exerciseType: workoutType,
        durationMinutes: durationMinutes,
        memo: workoutMemo,
        completed: workoutCompleted,
        isLocked: false,
        createdAt: new Date().toISOString()
      });
      alert('운동 기록이 저장되었습니다! 💪 하루 최대 1회 인증이 반영됩니다.');
      setWorkoutMemo('');
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      alert('로그인 오류: ' + error.message);
    }
  };

  const handleLogout = async () => { await signOut(auth); };

  // 7일(월~일) 날짜 배열 생성
  const getDaysOfCurrentWeek = () => {
    const days = [];
    let current = new Date(weekStartDate);
    for (let i = 0; i < 7; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const changeWeek = (direction) => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setWeekStartDate(newDate);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '100px', color: '#00838f', fontWeight: 'bold' }}>로딩 중... 🏝️</div>;
  }

  if (!currentUser) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', background: '#fdfbf7', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e0f2f1' }}>
        <h2 style={{ textAlign: 'center', color: '#00695c' }}>🏝️ 푸켓행 바디 챌린지</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '13px', marginBottom: '20px' }}>승현 & 상오니의 커플 식단 및 운동 미션 관리</p>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #b2dfdb' }} />
          <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #b2dfdb' }} />
          <button type="submit" style={{ padding: '12px', background: '#00838f', color: '#fff', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>{isSignUp ? '가입하기' : '로그인하기'}</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#ff7043', marginTop: '15px', width: '100%', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
        </button>
      </div>
    );
  }

  const totalPenalty = penalties.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const weekDays = getDaysOfCurrentWeek();

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', paddingBottom: '80px', fontFamily: 'sans-serif', background: '#fdfbf7', minHeight: '100vh', position: 'relative', color: '#333' }}>
      
      {alertMessage && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#ff5252', color: '#fff', padding: '12px 20px', borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', zIndex: 50, fontWeight: 'bold', fontSize: '13px' }}>
          {alertMessage}
        </div>
      )}

      <header style={{ padding: '15px', background: '#00838f', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>푸켓행 바디 챌린지 🏝️</h3>
        <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px' }}>{myName}님 환영해요!</span>
      </header>

      <main style={{ padding: '20px' }}>
        {activeTab === 'home' && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 100%)', padding: '20px', borderRadius: '16px', textAlign: 'center', marginBottom: '20px', border: '1px solid #b2dfdb' }}>
              <h2 style={{ margin: '0 0 8px 0', color: '#00695c' }}>푸켓까지 D-{calculateDday()} 🏝️</h2>
              <p style={{ margin: 0, color: '#00838f', fontSize: '13px', fontWeight: 'bold' }}>야자수 아래의 우리를 상상하며 오늘도 한 걸음!</p>
            </div>

            <h4 style={{ color: '#555', fontSize: '14px', marginBottom: '10px' }}>🏠 {partnerName}의 파트너 상태 카드</h4>
            <div style={{ background: '#fff', padding: '15px', borderRadius: '16px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', fontSize: '13px', color: '#555' }}>❤️ {partnerName}님과 함께 달리는 중</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handlePoke} style={{ flex: 1, padding: '10px', background: '#ff7043', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>🥗 식단 콕 찌르기 👉</button>
                <button onClick={handlePoke} style={{ flex: 1, padding: '10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>💪 운동 콕 찌르기 👉</button>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '15px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '13px', color: '#555' }}>💰 이번 달 누적 벌금 현황</p>
              <p style={{ margin: 0, color: '#d32f2f', fontWeight: 'bold', fontSize: '15px' }}>내 누적 벌금: {totalPenalty.toLocaleString()}원</p>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '16px', margin: 0 }}>📅 커플 주간 캘린더</h3>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => changeWeek(-1)} style={{ padding: '6px 10px', background: '#00838f', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>◀ 이전주</button>
                <button onClick={() => changeWeek(1)} style={{ padding: '6px 10px', background: '#00838f', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>다음주 ▶</button>
              </div>
            </div>
            <p style={{ color: '#666', fontSize: '11px', marginBottom: '15px' }}>
              {weekDays[0].toLocaleDateString()} ~ {weekDays[6].toLocaleDateString()} (월~일)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {weekDays.map((day, idx) => {
                const dateStr = day.toLocaleDateString('en-CA');
                const myRec = myRecords.find(r => r.targetDate === dateStr);
                const partnerRec = partnerRecords.find(r => r.targetDate === dateStr);
                const dayName = ['일', '월', '화', '수', '목', '금', '토'][day.getDay()];

                return (
                  <div key={idx} style={{ background: '#fff', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#00838f', marginBottom: '8px', borderBottom: '1px solid #f5f5f5', paddingBottom: '4px' }}>
                      {day.getMonth() + 1}월 {day.getDate()}일 ({dayName})
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      {/* 내 기록 */}
                      <div style={{ flex: 1, paddingRight: '8px', borderRight: '1px solid #eee' }}>
                        <span style={{ fontWeight: 'bold', color: '#333' }}>나 ({myName})</span>
                        <div style={{ marginTop: '4px', color: myRec ? (myRec.status === '성공' ? '#2e7d32' : myRec.status === '야자수 데이' ? '#f57c00' : '#d32f2f') : '#888' }}>
                          식단: {myRec ? `${myRec.status} ${myRec.status === '성공' ? '✅' : myRec.status === '야자수 데이' ? '🌴' : '❌'}` : '미입력 ⚪'}
                        </div>
                        {myRec?.photoUrls?.[0] && <div style={{ fontSize: '10px', color: '#00838f', marginTop: '2px' }}>📷 인증 사진 있음</div>}
                      </div>

                      {/* 상대방 기록 */}
                      <div style={{ flex: 1, paddingLeft: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: '#333' }}>상대 ({partnerName})</span>
                        <div style={{ marginTop: '4px', color: partnerRec ? (partnerRec.status === '성공' ? '#2e7d32' : partnerRec.status === '야자수 데이' ? '#f57c00' : '#d32f2f') : '#888' }}>
                          식단: {partnerRec ? `${partnerRec.status} ${partnerRec.status === '성공' ? '✅' : partnerRec.status === '야자수 데이' ? '🌴' : '❌'}` : '미입력 ⚪'}
                        </div>
                        {partnerRec?.photoUrls?.[0] && <div style={{ fontSize: '10px', color: '#00838f', marginTop: '2px' }}>📷 인증 사진 있음</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'record' && (
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>📝 식단 및 운동 기록 입력</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>대상 날짜 선택 (오늘 또는 어제만 가능):</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #b2dfdb', marginTop: '5px', boxSizing: 'border-box', background: '#fff' }} />
            </div>

            <form onSubmit={handleSaveDiet} style={{ background: '#fff', padding: '15px', borderRadius: '16px', marginBottom: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#00838f', fontSize: '13px' }}>🥗 식단 기록</h4>
              <select value={dietStatus} onChange={(e) => setDietStatus(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #b2dfdb', marginBottom: '10px', fontWeight: 'bold', fontSize: '13px', background: '#fff' }}>
                <option value="성공">성공 ✅</option>
                <option value="실패">실패 ❌</option>
                <option value="야자수 데이">야자수 데이 🌴 (치팅 예외일)</option>
              </select>
              <textarea placeholder="식단 메모 입력 (예: 닭가슴살 샐러드)" value={dietMemo} onChange={(e) => setDietMemo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #b2dfdb', marginBottom: '10px', height: '60px', fontSize: '13px', resize: 'none', boxSizing: 'border-box' }} />
              <input type="text" placeholder="인증 사진 URL (선택)" value={dietPhotoUrl} onChange={(e) => setDietPhotoUrl(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #b2dfdb', marginBottom: '10px', fontSize: '13px', boxSizing: 'border-box' }} />
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#00838f', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>식단 저장하기</button>
            </form>

            <form onSubmit={handleSaveWorkout} style={{ background: '#fff', padding: '15px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32', fontSize: '13px' }}>💪 운동 기록 (하루 최대 1회 인증)</h4>
              <input type="text" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} placeholder="운동 종류" style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #a5d6a7', marginBottom: '10px', fontSize: '13px', boxSizing: 'border-box' }} />
              <input type="text" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="운동 시간 (분)" style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #a5d6a7', marginBottom: '10px', fontSize: '13px', boxSizing: 'border-box' }} />
              <textarea placeholder="운동 메모" value={workoutMemo} onChange={(e) => setWorkoutMemo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #a5d6a7', marginBottom: '10px', height: '60px', fontSize: '13px', resize: 'none', boxSizing: 'border-box' }} />
              <button type="submit" style={{ width: '100%', padding: '12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>운동 완료 저장하기 🔥</button>
            </form>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>⚙️ 설정 및 앱 관리</h3>
            <p style={{ color: '#555', fontSize: '12px', marginBottom: '15px' }}>로그인 계정: <b>{currentUser.email}</b></p>
            
            <div style={{ marginBottom: '20px', padding: '15px', background: '#e0f7fa', borderRadius: '16px', border: '1px solid #b2dfdb' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: '#00695c' }}>📱 스마트폰 홈 화면에 앱 설치하기</p>
              <button onClick={handleInstallClick} style={{ padding: '12px', background: '#00838f', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '13px' }}>앱 설치하기 / 홈에 추가</button>
            </div>

            <button onClick={handleLogout} style={{ padding: '12px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '13px' }}>로그아웃 🚪</button>
          </div>
        )}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '400px', background: '#fff', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-around', padding: '10px 0', zIndex: 40, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        {[['home', '🏠 홈'], ['calendar', '📅 캘린더'], ['record', '📝 기록'], ['settings', '⚙️ 설정']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', color: activeTab === tab ? '#00838f' : '#888' }}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}