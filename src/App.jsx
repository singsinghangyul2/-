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
  increment 
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

  const [pokeCount, setPokeCount] = useState(0);
  const [alertMessage, setAlertMessage] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // 식단 및 운동 상태 관리
  const [dietInput, setDietInput] = useState('');
  const [dietList, setDietList] = useState([]);
  const [workoutDone, setWorkoutDone] = useState(false);

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

  // 콕 찌르기 실시간 동기화
  useEffect(() => {
    if (!currentUser) return;
    
    const docId = 'couple_poke_data';
    const docRef = doc(db, 'challenges', docId);

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
          setAlertMessage(`🚨 ${partnerName}님이 당신을 콕 찔렀습니다! 운동하세요! 👉`);
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
      alert('이미 앱이 설치되어 있거나, 브라우저 메뉴에서 [홈 화면에 추가]를 직접 선택해 주세요!');
    }
  };

  const handleAddDiet = (e) => {
    e.preventDefault();
    if (!dietInput.trim()) return;
    setDietList([...dietList, dietInput]);
    setDietInput('');
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
      alert('오류가 발생했습니다: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>로딩 중...</div>;
  }
if (!currentUser) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif', background: '#fdfbf7', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <h2 style={{ textAlign: 'center', color: '#00838f' }}>🏝️ 푸켓행 바디 챌린지</h2>
        <p style={{ textAlign: 'center', color: '#555', fontSize: '14px', marginBottom: '20px' }}>우리의 푸켓 여행을 위한 커플 미션 앱</p>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input 
            type="email" 
            placeholder="이메일 주소" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            style={{ padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #b2dfdb' }}
          />
          <input 
            type="password" 
            placeholder="비밀번호" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            style={{ padding: '12px', fontSize: '16px', borderRadius: '8px', border: '1px solid #b2dfdb' }}
          />
          <button type="submit" style={{ padding: '12px', fontSize: '16px', background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            {isSignUp ? '가입하기' : '로그인하기'}
          </button>
        </form>
        <button 
          onClick={() => setIsSignUp(!isSignUp)} 
          style={{ background: 'none', border: 'none', color: '#ff7043', marginTop: '15px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}
        >
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', paddingBottom: '90px', fontFamily: 'sans-serif', position: 'relative', background: '#fdfbf7', minHeight: '100vh' }}>
      
      {alertMessage && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#ff7043', color: '#fff', padding: '12px 20px', borderRadius: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 1000, fontWeight: 'bold' }}>
          {alertMessage}
        </div>
      )}

      <header style={{ padding: '15px 20px', background: '#00838f', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: 0 }}>푸켓행 바디 챌린지 🏝️</h3>
        <span style={{ fontSize: '14px', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '12px' }}>{myName}님 환영해요!</span>
      </header>

      <main style={{ padding: '20px' }}>
        {activeTab === 'home' && (
          <div>
            <div style={{ background: '#e0f7fa', padding: '20px', borderRadius: '15px', textAlign: 'center', marginBottom: '20px', border: '1px solid #b2dfdb' }}>
              <h2 style={{ margin: '0 0 5px 0', color: '#006064' }}>푸켓까지 D-Day 🏝️</h2>
              <p style={{ margin: 0, color: '#00838f', fontSize: '15px', fontWeight: 'bold' }}>우리의 푸켓 바디 만들기, 오늘도 파이팅!</p>
            </div>

            <h2>🏠 {partnerName}의 오늘의 미션</h2>
            <div style={{ background: '#ffebee', padding: '15px', borderRadius: '12px', marginTop: '15px', border: '1px solid #ffcdd2' }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#c62828' }}>
                ❤️ 현재 {partnerName}님을 응원하는 중입니다!
              </p>
            </div>
          </div>
        )}

        {activeTab === 'diet' && (
          <div>
            <h2>🥗 식단 관리</h2>
            <p style={{ color: '#666' }}>오늘 먹은 건강한 식단을 기록해보세요!</p>
            <form onSubmit={handleAddDiet} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <input 
                type="text" 
                placeholder="예: 닭가슴살 샐러드" 
                value={dietInput} 
                onChange={(e) => setDietInput(e.target.value)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #b2dfdb' }}
              />
              <button type="submit" style={{ padding: '12px 18px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>추가</button>
            </form>
            <ul style={{ marginTop: '20px', paddingLeft: '20px' }}>
              {dietList.map((item, index) => (
                <li key={index} style={{ marginBottom: '10px', fontSize: '16px', color: '#333' }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'workout' && (
          <div>
            <h2>💪 운동 루틴</h2>
            <p style={{ color: '#666' }}>푸켓을 위한 오늘의 운동을 체크해볼까요?</p>
            <div style={{ background: '#fff', padding: '18px', borderRadius: '12px', marginTop: '15px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
              <input 
                type="checkbox" 
                checked={workoutDone} 
                onChange={() => setWorkoutDone(!workoutDone)} 
                style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: '#00838f' }}
              />
              <span style={{ fontSize: '16px', fontWeight: 'bold', textDecoration: workoutDone ? 'line-through' : 'none', color: workoutDone ? '#9e9e9e' : '#333' }}>
                오늘의 필수 운동 완료하기 🔥
              </span>
            </div>
          </div>
        )}
        
        {activeTab === 'poke' && (
          <div>
            <h2>👉 콕 찌르기</h2>
            <p style={{ color: '#666' }}>{partnerName}님을 콕 찔러서 운동하라고 독려해보세요!</p>
            <div style={{ background: '#fff', padding: '30px', borderRadius: '15px', textAlign: 'center', marginTop: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
              <button 
                onClick={handlePoke}
                style={{ padding: '15px 30px', fontSize: '18px', background: '#ff7043', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(255,112,67,0.3)' }}
              >
                👉 {partnerName}님 콕 찌르기!
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div>
            <h2>⚙️ 설정</h2>
            <p style={{ color: '#666' }}>로그인 계정: <b>{currentUser.email}</b></p>
            
            <div style={{ margin: '20px 0', padding: '18px', background: '#e0f7fa', borderRadius: '12px', border: '1px solid #b2dfdb' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 'bold', color: '#006064' }}>📱 스마트폰 홈 화면에 앱으로 설치하기</p>
              <button 
                onClick={handleInstallClick}
                style={{ padding: '12px 18px', background: '#00838f', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                앱 설치하기 / 홈에 추가
              </button>
            </div>

            <button 
              onClick={handleLogout}
              style={{ padding: '12px 20px', background: '#c62828', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '10px' }}
            >
              로그아웃 🚪
            </button>
          </div>
        )}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-around', padding: '12px 0', maxWidth: '500px', margin: '0 auto', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'home' ? 'bold' : 'normal', color: activeTab === 'home' ? '#00838f' : '#666' }}>🏠 홈</button>
        <button onClick={() => setActiveTab('diet')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'diet' ? 'bold' : 'normal', color: activeTab === 'diet' ? '#00838f' : '#666' }}>🥗 식단</button>
        <button onClick={() => setActiveTab('workout')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'workout' ? 'bold' : 'normal', color: activeTab === 'workout' ? '#00838f' : '#666' }}>💪 운동</button>
        <button onClick={() => setActiveTab('poke')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'poke' ? 'bold' : 'normal', color: activeTab === 'poke' ? '#00838f' : '#666' }}>👉 콕</button>
        <button onClick={() => setActiveTab('settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'settings' ? 'bold' : 'normal', color: activeTab === 'settings' ? '#00838f' : '#666' }}>⚙️ 설정</button>
      </nav>
    </div>
  );
}