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
  addTimestamp,
  serverTimestamp
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

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  // 앱 주요 상태 관리 (기획안 반영)
  const [pokeCount, setPokeCount] = useState(0);
  const [alertMessage, setAlertMessage] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // 식단 및 운동 입력 상태
  const [dietInput, setDietInput] = useState('');
  const [dietStatus, setDietStatus] = useState('성공'); // 성공, 실패, 야자수 데이
  const [dietList, setDietList] = useState([]);
  
  const [workoutType, setWorkoutType] = useState('헬스');
  const [workoutMinutes, setWorkoutMinutes] = useState('30');
  const [workoutDone, setWorkoutDone] = useState(false);
  const [workoutList, setWorkoutList] = useState([]);

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

  // 커플 사용자 자동 매칭 (승현 ↔ 상오니)
  const userEmail = currentUser?.email ? currentUser.email.trim().toLowerCase() : '';
  const isSeungHyun = userEmail === 'ysh94335@gmail.com';

  const partnerEmail = isSeungHyun ? 'sang5ny@gmail.com' : 'ysh94335@gmail.com';
  const partnerName = isSeungHyun ? '상오니' : '승현';
  const myName = isSeungHyun ? '승현' : '상오니';

  // 푸켓 여행 D-Day 계산 (기준일: 2026년 12월 31일 예시)
  const calculateDday = () => {
    const targetDate = new Date('2026-12-31');
    const today = new Date();
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // 콕 찌르기 실시간 연동
  useEffect(() => {
    if (!currentUser) return;
    
    const docRef = doc(db, 'challenges', 'couple_poke_data');

    getDoc(docRef).then((docSnap) => {
      if (!docSnap.exists()) {
        setDoc(docRef, { [currentUser.email]: 0, [partnerEmail]: 0 });
      }
    });

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentMyPoke = data[currentUser.email] || 0;
        
        if (currentMyPoke > pokeCount && pokeCount !== 0) {
          setAlertMessage(`🚨 ${partnerName}님이 당신을 콕 찔렀습니다! 미션을 확인하세요! 👉`);
          setTimeout(() => setAlertMessage(''), 4000);
        }
        setPokeCount(currentMyPoke);
      }
    });

    return () => unsubscribe();
  }, [currentUser, partnerEmail, pokeCount, partnerName]);

  const handlePoke = async () => {
    try {
      const docRef = doc(db, 'challenges', 'couple_poke_data');
      await updateDoc(docRef, {
        [partnerEmail]: increment(1)
      });
      alert(`${partnerName}님을 콕 찔렀습니다! 👉`);
    } catch (error) {
      alert('오류 발생: ' + error.message);
    }
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        setDeferredPrompt(null);
      });
    } else {
      alert('브라우저 메뉴(점 3개)에서 [홈 화면에 추가] 또는 [앱 설치]를 선택해 주세요!');
    }
  };

  const handleAddDiet = (e) => {
    e.preventDefault();
    if (!dietInput.trim()) return;
    setDietList([...dietList, { text: dietInput, status: dietStatus, date: new Date().toLocaleDateString() }]);
    setDietInput('');
  };

  const handleAddWorkout = (e) => {
    e.preventDefault();
    setWorkoutList([...workoutList, { type: workoutType, minutes: workoutMinutes, date: new Date().toLocaleDateString() }]);
    setWorkoutDone(true);
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

  const handleLogout = async () => {
    await signOut(auth);
  };
  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '100px', fontSize: '18px', color: '#00838f' }}>푸켓행 바디 챌린지 로딩 중... 🏝️</div>;
  }

  if (!currentUser) {
    return (
      <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', fontFamily: 'sans-serif', background: '#fdfbf7', borderRadius: '20px', boxShadow: '0 8px 25px rgba(0,0,0,0.08)', border: '1px solid #b2dfdb' }}>
        <h2 style={{ textAlign: 'center', color: '#00838f', marginBottom: '8px' }}>🏝️ 푸켓행 바디 챌린지</h2>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '25px' }}>우리의 푸켓 여행을 위한 커플 미션 앱</p>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input 
            type="email" 
            placeholder="이메일 주소" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            style={{ padding: '14px', fontSize: '16px', borderRadius: '10px', border: '1px solid #b2dfdb', background: '#fff' }}
          />
          <input 
            type="password" 
            placeholder="비밀번호" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            style={{ padding: '14px', fontSize: '16px', borderRadius: '10px', border: '1px solid #b2dfdb', background: '#fff' }}
          />
          <button type="submit" style={{ padding: '14px', fontSize: '16px', background: '#00838f', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,131,143,0.3)' }}>
            {isSignUp ? '가입하기' : '로그인하기'}
          </button>
        </form>
        <button 
          onClick={() => setIsSignUp(!isSignUp)} 
          style={{ background: 'none', border: 'none', color: '#ff7043', marginTop: '20px', cursor: 'pointer', width: '100%', fontWeight: 'bold', fontSize: '14px' }}
        >
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', paddingBottom: '90px', fontFamily: 'sans-serif', position: 'relative', background: '#fdfbf7', minHeight: '100vh' }}>
      
      {alertMessage && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#ff7043', color: '#fff', padding: '12px 20px', borderRadius: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 1000, fontWeight: 'bold', fontSize: '14px' }}>
          {alertMessage}
        </div>
      )}

      <header style={{ padding: '15px 20px', background: '#00838f', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>푸켓행 바디 챌린지 🏝️</h3>
        <span style={{ fontSize: '13px', background: 'rgba(255,255,255,0.2)', padding: '5px 12px', borderRadius: '15px', fontWeight: 'bold' }}>{myName}님 환영해요!</span>
      </header>

      <main style={{ padding: '20px' }}>
        {activeTab === 'home' && (
          <div>
            <div style={{ background: '#e0f7fa', padding: '22px', borderRadius: '16px', textAlign: 'center', marginBottom: '20px', border: '1px solid #b2dfdb', boxShadow: '0 4px 15px rgba(0,131,143,0.05)' }}>
              <h2 style={{ margin: '0 0 8px 0', color: '#006064', fontSize: '24px' }}>푸켓까지 D-{calculateDday()} 🏝️</h2>
              <p style={{ margin: 0, color: '#00838f', fontSize: '15px', fontWeight: 'bold' }}>우리의 푸켓 바디 만들기, 오늘도 파이팅!</p>
            </div>

            <h3 style={{ color: '#333', marginBottom: '12px' }}>🏠 {partnerName}의 파트너 상태 카드</h3>
            <div style={{ background: '#fff', padding: '18px', borderRadius: '14px', marginBottom: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#333' }}>❤️ {partnerName}님과 함께 달리는 중</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handlePoke}
                  style={{ flex: 1, padding: '10px', background: '#ff7043', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                >
                  🥗 식단 콕 찌르기 👉
                </button>
                <button 
                  onClick={handlePoke}
                  style={{ flex: 1, padding: '10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                >
                  💪 운동 콕 찌르기 👉
                </button>
              </div>
            </div>

            <div style={{ background: '#fff9c4', padding: '16px', borderRadius: '14px', border: '1px solid #fff59d' }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#f57f17', fontSize: '14px' }}>
                💡 팁: 하단 메뉴의 [기록] 탭에서 오늘 식단과 운동을 입력하고, [설정] 탭에서 스마트폰 홈 화면에 앱을 설치해 보세요!
              </p>
            </div>
          </div>
        )}

        {activeTab === 'diet' && (
          <div>
            <h2>🥗 식단 및 운동 기록</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>오늘의 건강한 식단과 운동 루틴을 기록하세요!</p>
            
            <form onSubmit={handleAddDiet} style={{ background: '#fff', padding: '18px', borderRadius: '14px', marginTop: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#00838f' }}>식단 기록하기</h4>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <select value={dietStatus} onChange={(e) => setDietStatus(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #b2dfdb', fontWeight: 'bold' }}>
                  <option value="성공">성공 ✅</option>
                  <option value="실패">실패 ❌</option>
                  <option value="야자수 데이">야자수 데이 🌴</option>
                </select>
                <input 
                  type="text" 
                  placeholder="예: 닭가슴살 샐러드" 
                  value={dietInput} 
                  onChange={(e) => setDietInput(e.target.value)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #b2dfdb' }}
                />
              </div>
              <button type="submit" style={{ width: '100%', padding: '10px', background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>식단 추가</button>
            </form>

            <form onSubmit={handleAddWorkout} style={{ background: '#fff', padding: '18px', borderRadius: '14px', marginTop: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>운동 기록하기</h4>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input type="text" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} placeholder="운동 종류" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #c8e6c9' }} />
                <input type="text" value={workoutMinutes} onChange={(e) => setWorkoutMinutes(e.target.value)} placeholder="시간(분)" style={{ width: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #c8e6c9' }} />
              </div>
              <button type="submit" style={{ width: '100%', padding: '10px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>운동 완료 체크 🔥</button>
            </form>

            <div style={{ marginTop: '20px' }}>
              <h4>📜 나의 기록 리스트</h4>
              <ul style={{ paddingLeft: '20px', color: '#444' }}>
                {dietList.map((d, i) => (
                  <li key={i} style={{ marginBottom: '6px' }}>[{d.date}] 식단: {d.text} ({d.status})</li>
                ))}
                {workoutList.map((w, i) => (
                  <li key={'w'+i} style={{ marginBottom: '6px', color: '#2e7d32' }}>[{w.date}] 운동: {w.type} {w.minutes}분 완료</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <h2>📊 월별 통계 및 벌금 현황</h2>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '14px', marginTop: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#333' }}>💰 이번 달 누적 벌금 현황</p>
              <p style={{ margin: '0 0 5px 0', color: '#c62828', fontSize: '16px' }}>내 누적 벌금: <b>0원</b></p>
              <p style={{ margin: 0, color: '#c62828', fontSize: '16px' }}>{partnerName} 누적 벌금: <b>0원</b></p>
            </div>
          </div>
        )}
        
        {activeTab === 'poke' && (
          <div>
            <h2>👉 콕 찌르기 센터</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>{partnerName}님에게 알림을 보내 자극을 주세요!</p>
            <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', textAlign: 'center', marginTop: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
              <button 
                onClick={handlePoke}
                style={{ padding: '15px 30px', fontSize: '18px', background: '#ff7043', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,112,67,0.3)' }}
              >
                👉 {partnerName}님 강력하게 콕 찌르기!
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div>
            <h2>⚙️ 설정 및 앱 관리</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>로그인 계정: <b>{currentUser.email}</b></p>
            
            <div style={{ margin: '20px 0', padding: '18px', background: '#e0f7fa', borderRadius: '14px', border: '1px solid #b2dfdb' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 'bold', color: '#006064' }}>📱 스마트폰 홈 화면에 앱으로 설치하기 (PWA)</p>
              <button 
                onClick={handleInstallClick}
                style={{ padding: '12px 18px', background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                앱 설치하기 / 홈 화면에 추가
              </button>
            </div>

            <button 
              onClick={handleLogout}
              style={{ padding: '14px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '10px' }}
            >
              로그아웃 🚪
            </button>
          </div>
        )}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-around', padding: '12px 0', maxWidth: '500px', margin: '0 auto', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', zIndex: 100 }}>
        <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'home' ? 'bold' : 'normal', color: activeTab === 'home' ? '#00838f' : '#666', fontSize: '13px' }}>🏠 홈</button>
        <button onClick={() => setActiveTab('diet')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'diet' ? 'bold' : 'normal', color: activeTab === 'diet' ? '#00838f' : '#666', fontSize: '13px' }}>📝 기록</button>
        <button onClick={() => setActiveTab('stats')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'stats' ? 'bold' : 'normal', color: activeTab === 'stats' ? '#00838f' : '#666', fontSize: '13px' }}>📊 통계</button>
        <button onClick={() => setActiveTab('poke')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'poke' ? 'bold' : 'normal', color: activeTab === 'poke' ? '#00838f' : '#666', fontSize: '13px' }}>👉 콕</button>
        <button onClick={() => setActiveTab('settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'settings' ? 'bold' : 'normal', color: activeTab === 'settings' ? '#00838f' : '#666', fontSize: '13px' }}>⚙️ 설정</button>
      </nav>
    </div>
  );
}