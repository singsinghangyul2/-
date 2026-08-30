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

// ==========================================
// 파이어베이스 설정 (기존 설정 유지)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSy...", 
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
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

  // 데이터베이스 상태
  const [pokeCount, setPokeCount] = useState(0);

  // 인증 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 이메일 매칭 및 상대방 판별
  const userEmail = currentUser?.email ? currentUser.email.trim().toLowerCase() : '';
  const isSeungHyun = userEmail === 'ysh94335@gmail.com';

  const partnerEmail = isSeungHyun ? 'sang5ny@gmail.com' : 'ysh94335@gmail.com';
  const partnerName = isSeungHyun ? '상오니' : '승현';
  const myName = isSeungHyun ? '승현' : '상오니';

  // 콕 찌르기 데이터 실시간 동기화 (Firestore)
  useEffect(() => {
    if (!currentUser) return;
    
    // 두 사람 간의 공용 문서 ID (알파벳순으로 정렬해서 고정)
    const docId = 'couple_poke_data';
    const docRef = doc(db, 'challenges', docId);

    // 문서가 없으면 초기 생성
    getDoc(docRef).then((docSnap) => {
      if (!docSnap.exists()) {
        setDoc(docRef, { [partnerEmail]: 0 });
      }
    });

    // 실시간 리스너 연결
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // 내가 상대방을  찌른 횟수 혹은 상대방이 나를 찌른 횟수 가져오기
        setPokeCount(data[currentUser.email] || 0);
      }
    });

    return () => unsubscribe();
  }, [currentUser, partnerEmail]);

  // 콕 찌르기 버튼 클릭 핸들러
  const handlePoke = async () => {
    try {
      const docRef = doc(db, 'challenges', 'couple_poke_data');
      // 상대방의 찌르기 카운트를 1 증가시킴 (상대방 화면에 반영됨)
      await updateDoc(docRef, {
        [partnerEmail]: increment(1)
      });
      alert(`${partnerName}님을 콕 찔렀습니다! 👉`);
    } catch (error) {
      alert('오류 발생: ' + error.message);
    }
  };

  // 로그인 핸들러
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
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif' }}>
        <h2>{isSignUp ? '회원가입' : '로그인'}</h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input 
            type="email" 
            placeholder="이메일 주소" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <input 
            type="password" 
            placeholder="비밀번호" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <button type="submit" style={{ padding: '10px', fontSize: '16px', background: '#ff6b6b', color: '#fff', border: 'none', borderRadius: '5px' }}>
            {isSignUp ? '가입하기' : '로그인하기'}
          </button>
        </form>
        <button 
          onClick={() => setIsSignUp(!isSignUp)} 
          style={{ background: 'none', border: 'none', color: '#007bff', marginTop: '15px', cursor: 'pointer', width: '100%' }}
        >
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', paddingBottom: '80px', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '15px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>푸켓행 바디 챌린지 🏝️</h3>
        <span style={{ fontSize: '14px', color: '#666' }}>{myName}님 환영해요!</span>
      </header>

      <main style={{ padding: '20px' }}>
        {activeTab === 'home' && (
          <div>
            <h2>🏠 홈 화면</h2>
            <div style={{ background: '#fff0f0', padding: '15px', borderRadius: '10px', marginTop: '15px' }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#d9534f' }}>
                ❤️ 현재 {partnerName}님을 응원하는 중입니다!
              </p>
            </div>
          </div>
        )}

        {activeTab === 'diet' && <h2>🥗 식단 관리</h2>}
        {activeTab === 'workout' && <h2>💪 운동 루틴</h2>}
        
        {activeTab === 'poke' && (
          <div>
            <h2>👉 콕 찌르기</h2>
            <p>{partnerName}님을 콕 찔러서 운동하라고 독려해보세요!</p>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', textAlign: 'center', marginTop: '20px' }}>
              <p style={{ fontSize: '18px', marginBottom: '15px' }}>
                상대방이 나를   찌른 횟수: <b>{pokeCount}번</b>
              </p>
              <button 
                onClick={handlePoke}
                style={{ padding: '12px 24px', fontSize: '16px', background: '#ff6b6b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                👉 {partnerName}님 콕 찌르기!
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div>
            <h2>⚙️ 설정</h2>
            <p>로그인 계정: {currentUser.email}</p>
            <button 
              onClick={handleLogout}
              style={{ padding: '10px 20px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '20px' }}
            >
              로그아웃 🚪
            </button>
          </div>
        )}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-around', padding: '10px 0', maxWidth: '500px', margin: '0 auto' }}>
        <button onClick={() => setActiveTab('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'home' ? 'bold' : 'normal' }}>🏠 홈</button>
        <button onClick={() => setActiveTab('diet')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'diet' ? 'bold' : 'normal' }}>🥗 식단</button>
        <button onClick={() => setActiveTab('workout')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'workout' ? 'bold' : 'normal' }}>💪 운동</button>
        <button onClick={() => setActiveTab('poke')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'poke' ? 'bold' : 'normal' }}>👉 콕</button>
        <button onClick={() => setActiveTab('settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'settings' ? 'bold' : 'normal' }}>⚙️ 설정</button>
      </nav>
    </div>
  );
}