import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  increment,
  collection,
  addDoc,
  query,
  where,
  getDocs
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

// 이메일 주소의 점(.)을 언더바(_)로 치환하여 Firestore 필드 키 중첩 오류 방지
const sanitizeEmail = (email) => email ? email.trim().toLowerCase().replace(/\./g, '_') : '';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  // 상태 관리
  const [pokeCount, setPokeCount] = useState(0);
  const [alertMessage, setAlertMessage] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // 식단 및 운동 입력 상태
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [dietStatus, setDietStatus] = useState('성공'); // 성공, 실패, 야자수 데이
  const [dietMemo, setDietMemo] = useState('');
  const [dietPhotoUrl, setDietPhotoUrl] = useState('');
  
  const [workoutType, setWorkoutType] = useState('헬스/피트니스');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [workoutMemo, setWorkoutMemo] = useState('');
  const [workoutCompleted, setWorkoutCompleted] = useState(true);

  // 기록 목록
  const [myRecords, setMyRecords] = useState([]);

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
    const targetDateObj = new Date('2026-12-31');
    const today = new Date();
    const diffTime = targetDateObj - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // 실시간 콕 찌르기 동기화 (오류 핸들러 및 이메일 키 살균 적용)
  useEffect(() => {
    if (!currentUser) return;
    const docRef = doc(db, 'challenges', 'couple_poke_data');
    
    getDoc(docRef).then((docSnap) => {
      if (!docSnap.exists()) {
        setDoc(docRef, { [sanitizedMyEmailKey]: 0, [sanitizedPartnerEmailKey]: 0 });
      }
    }).catch((err) => console.error("Poke doc init error:", err));

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentMyPoke = data[sanitizedMyEmailKey] || 0;
        if (currentMyPoke > pokeCount && pokeCount !== 0) {
          setAlertMessage(`🚨 ${partnerName}님이 당신을 콕 찔렀습니다! 미션을 확인하세요! 👉`);
          setTimeout(() => setAlertMessage(''), 4000);
        }
        setPokeCount(currentMyPoke);
      }
    }, (error) => {
      console.error("Firestore 실시간 동기화 에러:", error);
    });

    return () => unsubscribe();
  }, [currentUser, sanitizedMyEmailKey, sanitizedPartnerEmailKey, pokeCount, partnerName]);

  // Firestore에서 내 기록 불러오기
  useEffect(() => {
    if (!currentUser) return;
    const fetchRecords = async () => {
      try {
        const q = query(collection(db, 'dietCheckins'), where('ownerEmail', '==', currentUser.email));
        const querySnapshot = await getDocs(q);
        const list = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setMyRecords(list);
      } catch (e) {
        console.error("Record fetch error:", e);
      }
    };
    fetchRecords();
  }, [currentUser, activeTab]);

  const handlePoke = async () => {
    try {
      const docRef = doc(db, 'challenges', 'couple_poke_data');
      await updateDoc(docRef, { [sanitizedPartnerEmailKey]: increment(1) });
      alert(`${partnerName}님을 콕 찔렀습니다! 👉`);
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

  // 식단 저장
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
        photoUrl: dietPhotoUrl,
        createdAt: new Date().toISOString()
      });
      alert('식단 기록이 저장되었습니다! 🥗');
      setDietMemo('');
      setDietPhotoUrl('');
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  // 운동 저장
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
        createdAt: new Date().toISOString()
      });
      alert('운동 기록이 저장되었습니다! 💪');
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

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '100px', fontSize: '18px', color: '#00838f' }}>로딩 중... 🏝️</div>;
  }

  if (!currentUser) {
    return (
      <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', fontFamily: 'sans-serif', background: '#fdfbf7', borderRadius: '20px', boxShadow: '0 8px 25px rgba(0,0,0,0.08)', border: '1px solid #b2dfdb' }}>
        <h2 style={{ textAlign: 'center', color: '#00838f', marginBottom: '8px' }}>🏝️ 푸켓행 바디 챌린지</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '25px' }}>커플 식단 및 운동 미션 관리 앱</p>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '14px', borderRadius: '10px', border: '1px solid #b2dfdb' }} />
          <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '14px', borderRadius: '10px', border: '1px solid #b2dfdb' }} />
          <button type="submit" style={{ padding: '14px', background: '#00838f', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{isSignUp ? '가입하기' : '로그인하기'}</button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#ff7043', marginTop: '20px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', paddingBottom: '90px', fontFamily: 'sans-serif', background: '#fdfbf7', minHeight: '100vh', position: 'relative' }}>
      
      {alertMessage && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#ff7043', color: '#fff', padding: '12px 20px', borderRadius: '25px', zIndex: 1000, fontWeight: 'bold', fontSize: '14px' }}>
          {alertMessage}
        </div>
      )}

      <header style={{ padding: '15px 20px', background: '#00838f', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>푸켓행 바디 챌린지 🏝️</h3>
        <span style={{ fontSize: '13px', background: 'rgba(255,255,255,0.2)', padding: '5px 12px', borderRadius: '15px', fontWeight: 'bold' }}>{myName}님 환영해요!</span>
      </header>

      <main style={{ padding: '20px' }}>
        {activeTab === 'home' && (
          <div>
            <div style={{ background: '#e0f7fa', padding: '22px', borderRadius: '16px', textAlign: 'center', marginBottom: '20px', border: '1px solid #b2dfdb' }}>
              <h2 style={{ margin: '0 0 8px 0', color: '#006064', fontSize: '24px' }}>푸켓까지 D-{calculateDday()} 🏝️</h2>
              <p style={{ margin: 0, color: '#00838f', fontSize: '15px', fontWeight: 'bold' }}>우리의 푸켓 바디 만들기, 오늘도 파이팅!</p>
            </div>

            <h3 style={{ color: '#333', marginBottom: '12px' }}>🏠 {partnerName}의 파트너 상태 카드</h3>
            <div style={{ background: '#fff', padding: '18px', borderRadius: '14px', marginBottom: '15px', border: '1px solid #eee' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#333' }}>❤️ {partnerName}님과 함께 달리는 중</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handlePoke} style={{ flex: 1, padding: '10px', background: '#ff7043', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🥗 식단 콕 찌르기 👉</button>
                <button onClick={handlePoke} style={{ flex: 1, padding: '10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>💪 운동 콕 찌르기 👉</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div>
            <h2>📅 주간 캘린더 및 기록 조회</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>나와 상대방의 인증 상태를 한눈에 확인하세요.</p>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '14px', marginTop: '15px', border: '1px solid #eee' }}>
              <h4>내 저장된 기록 내역 ({myRecords.length}개)</h4>
              {myRecords.map((r, i) => (
                <div key={i} style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '14px' }}>
                  <b>[{r.targetDate}]</b> 식단: {r.status} / 메모: {r.memo || '없음'}
                  {r.photoUrl && <p style={{ margin: '5px 0 0 0', color: '#00838f' }}>📷 사진 첨부됨</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'record' && (
          <div>
            <h2>📝 식단 및 운동 기록 입력</h2>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#555' }}>대상 날짜 선택:</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #b2dfdb', marginTop: '5px' }} />
            </div>

            <form onSubmit={handleSaveDiet} style={{ background: '#fff', padding: '18px', borderRadius: '14px', marginBottom: '15px', border: '1px solid #eee' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#00838f' }}>🥗 식단 기록</h4>
              <select value={dietStatus} onChange={(e) => setDietStatus(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #b2dfdb', marginBottom: '10px', fontWeight: 'bold' }}>
                <option value="성공">성공 ✅</option>
                <option value="실패">실패 ❌</option>
                <option value="야자수 데이">야자수 데이 🌴</option>
              </select>
              <textarea placeholder="식단 메모 입력 (예: 닭가슴살 샐러드)" value={dietMemo} onChange={(e) => setDietMemo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #b2dfdb', marginBottom: '10px', height: '60px' }} />
              <input type="text" placeholder="인증 사진 URL (선택 사항)" value={dietPhotoUrl} onChange={(e) => setDietPhotoUrl(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #b2dfdb', marginBottom: '10px' }} />
              <button type="submit" style={{ width: '100%', padding: '10px', background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>식단 저장하기</button>
            </form>

            <form onSubmit={handleSaveWorkout} style={{ background: '#fff', padding: '18px', borderRadius: '14px', border: '1px solid #eee' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>💪 운동 기록</h4>
              <input type="text" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} placeholder="운동 종류" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c8e6c9', marginBottom: '10px' }} />
              <input type="text" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="운동 시간 (분)" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c8e6c9', marginBottom: '10px' }} />
              <textarea placeholder="운동 메모" value={workoutMemo} onChange={(e) => setWorkoutMemo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #c8e6c9', marginBottom: '10px', height: '60px' }} />
              <button type="submit" style={{ width: '100%', padding: '10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>운동 완료 저장하기 🔥</button>
            </form>
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <h2>📊 월별 통계 및 벌금 현황</h2>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '14px', marginTop: '15px', border: '1px solid #eee' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#333' }}>💰 이번 달 누적 벌금 현황</p>
              <p style={{ margin: '0 0 5px 0', color: '#c62828' }}>내 누적 벌금: <b>0원</b></p>
              <p style={{ margin: 0, color: '#c62828' }}>{partnerName} 누적 벌금: <b>0원</b></p>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div>
            <h2>⚙️ 설정 및 앱 관리</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>로그인 계정: <b>{currentUser.email}</b></p>
            
            <div style={{ margin: '20px 0', padding: '18px', background: '#e0f7fa', borderRadius: '14px', border: '1px solid #b2dfdb' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 'bold', color: '#006064' }}>📱 스마트폰 홈 화면에 앱으로 설치하기 (PWA)</p>
              <button onClick={handleInstallClick} style={{ padding: '12px 18px', background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>앱 설치하기 / 홈에 추가</button>
            </div>

            <button onClick={handleLogout} style={{ padding: '14px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>로그아웃 🚪</button>
          </div>
        )}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '500px', background: '#fff', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-around', padding: '10px 0', zIndex: 100 }}>
        <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'home' ? 'bold' : 'normal', color: activeTab === 'home' ? '#00838f' : '#666', fontSize: '12px' }}>🏠 홈</button>
        <button onClick={() => setActiveTab('calendar')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'calendar' ? 'bold' : 'normal', color: activeTab === 'calendar' ? '#00838f' : '#666', fontSize: '12px' }}>📅 캘린더</button>
        <button onClick={() => setActiveTab('record')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'record' ? 'bold' : 'normal', color: activeTab === 'record' ? '#00838f' : '#666', fontSize: '12px' }}>📝 기록</button>
        <button onClick={() => setActiveTab('stats')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'stats' ? 'bold' : 'normal', color: activeTab === 'stats' ? '#00838f' : '#666', fontSize: '12px' }}>📊 통계</button>
        <button onClick={() => setActiveTab('settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'settings' ? 'bold' : 'normal', color: activeTab === 'settings' ? '#00838f' : '#666', fontSize: '12px' }}>⚙️ 설정</button>
      </nav>
    </div>
  );
}