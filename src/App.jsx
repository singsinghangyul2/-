import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, onSnapshot, collection, addDoc, query, where, getDocs, deleteDoc, 
  doc as firestoreDoc
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

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const [pokeCount, setPokeCount] = useState(0);
  const [alertMessage, setAlertMessage] = useState('');

  const [targetDate, setTargetDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }));
  const [dietStatus, setDietStatus] = useState('성공'); 
  const [dietMemo, setDietMemo] = useState('');
  const [uploadingDietImage, setUploadingDietImage] = useState(false);
  const [dietPhotoUrls, setDietPhotoUrls] = useState([]);
  
  const [workoutType, setWorkoutType] = useState('헬스/피트니스');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [workoutMemo, setWorkoutMemo] = useState('');
  const [uploadingWorkoutImage, setUploadingWorkoutImage] = useState(false);
  const [workoutPhotoUrls, setWorkoutPhotoUrls] = useState([]);

  const [myRecords, setMyRecords] = useState([]);
  const [partnerRecords, setPartnerRecords] = useState([]);
  const [penalties, setPenalties] = useState([]);

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDateForDetail, setSelectedDateForDetail] = useState(null);
  
  // 사진 크게 보기(모달)를 위한 상태
  const [modalImageSrc, setModalImageSrc] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
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
          setAlertMessage(`🍍 ${partnerName}님이 상큼한 응원을 보냈어요!`);
          setTimeout(() => setAlertMessage(''), 5000);
        }
        setPokeCount(currentMyPoke);
      } else {
        setDoc(docRef, { [sanitizedMyEmailKey]: 0, [sanitizedPartnerEmailKey]: 0 });
      }
    });

    return () => unsubscribe();
  }, [currentUser, sanitizedMyEmailKey, sanitizedPartnerEmailKey, pokeCount, partnerName]);

  const fetchRecords = async () => {
    if (!currentUser) return;
    try {
      const myQ = query(collection(db, 'dietCheckins'), where('ownerEmail', '==', currentUser.email));
      const mySnap = await getDocs(myQ);
      const myList = [];
      mySnap.forEach((docSnap) => myList.push({ id: docSnap.id, ...docSnap.data() }));
      setMyRecords(myList);

      const partnerQ = query(collection(db, 'dietCheckins'), where('ownerEmail', '==', partnerEmail));
      const partnerSnap = await getDocs(partnerQ);
      const partnerList = [];
      partnerSnap.forEach((docSnap) => partnerList.push({ id: docSnap.id, ...docSnap.data() }));
      setPartnerRecords(partnerList);

      const pQuery = query(collection(db, 'penalties'), where('ownerEmail', '==', currentUser.email));
      const pSnapshot = await getDocs(pQuery);
      const pList = [];
      pSnapshot.forEach((docSnap) => pList.push(docSnap.data()));
      setPenalties(pList);
    } catch (e) {
      console.error("Fetch error:", e);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [currentUser, activeTab, partnerEmail]);

  const processImageFiles = (files, setUploading, setUrlsState, currentUrls) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    
    const newFiles = Array.from(files);
    let processedCount = 0;
    const results = [...currentUrls];

    newFiles.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`'${file.name}' 사진 용량이 10MB를 초과하여 제외되었습니다.`);
        processedCount++;
        if (processedCount === newFiles.length) setUploading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          results.push(dataUrl);

          processedCount++;
          if (processedCount === newFiles.length) {
            setUrlsState(results);
            setUploading(false);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDietImagesUpload = (e) => {
    processImageFiles(e.target.files, setUploadingDietImage, setDietPhotoUrls, dietPhotoUrls);
  };

  const handleWorkoutImagesUpload = (e) => {
    processImageFiles(e.target.files, setUploadingWorkoutImage, setWorkoutPhotoUrls, workoutPhotoUrls);
  };

  const handlePoke = async () => {
    try {
      const docRef = doc(db, 'challenges', 'couple_poke_data');
      const snap = await getDoc(docRef);
      let currentVal = 0;
      if (snap.exists()) {
        currentVal = snap.data()[sanitizedPartnerEmailKey] || 0;
      }
      await setDoc(docRef, { [sanitizedPartnerEmailKey]: currentVal + 1 }, { merge: true });
      alert(`✨ ${partnerName}님에게 응원의 파도를 보냈어요! 🌊`);
    } catch (error) {
      alert('오류 발생: ' + error.message);
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
        photoUrls: dietPhotoUrls,
        workoutType: '',
        durationMinutes: '',
        workoutMemo: '',
        workoutPhotoUrls: [],
        createdAt: new Date().toISOString()
      });
      alert('🥗 식단 기록이 저장되었습니다!');
      setDietMemo('');
      setDietPhotoUrls([]);
      fetchRecords();
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  const handleSaveWorkout = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'dietCheckins'), {
        coupleID: 'couple_01',
        ownerEmail: currentUser.email,
        partnerEmail: partnerEmail,
        targetDate: targetDate,
        status: '운동완료',
        memo: workoutMemo,
        photoUrls: [],
        workoutType: workoutType,
        durationMinutes: durationMinutes,
        workoutMemo: workoutMemo,
        workoutPhotoUrls: workoutPhotoUrls,
        createdAt: new Date().toISOString()
      });
      alert('💪 운동 기록이 저장되었습니다!');
      setWorkoutMemo('');
      setWorkoutPhotoUrls([]);
      fetchRecords();
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('정말 이 기록을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(firestoreDoc(db, 'dietCheckins', recordId));
      alert('기록이 삭제되었습니다.');
      setSelectedDateForDetail(null);
      fetchRecords();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
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

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const changeMonth = (direction) => {
    const newDate = new Date(currentMonthDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonthDate(newDate);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#F4FBFB', color: '#008B8B', fontWeight: 'bold', fontSize: '15px' }}>
        🌴 푸켓 바다 불러오는 중...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ maxWidth: '400px', margin: '40px auto', padding: '32px', background: '#FFFFFF', borderRadius: '28px', boxShadow: '0 20px 40px rgba(0, 139, 139, 0.1)', border: '1px solid #E0F2F1' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span style={{ fontSize: '48px' }}>🍍</span>
          <h2 style={{ color: '#008B8B', fontSize: '24px', fontWeight: '900', margin: '12px 0 4px 0' }}>푸켓행 바디 챌린지</h2>
          <p style={{ color: '#FF7F50', fontSize: '13px', fontWeight: 'bold', margin: 0 }}>✨ 승현 & 상오니의 달콤살벌 커플 다이어트</p>
        </div>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #E0F2F1', outline: 'none', fontSize: '14px', background: '#F8FBFB', boxSizing: 'border-box', fontWeight: '500' }} />
          <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #E0F2F1', outline: 'none', fontSize: '14px', background: '#F8FBFB', boxSizing: 'border-box', fontWeight: '500' }} />
          <button type="submit" style={{ width: '100%', padding: '16px', background: '#008B8B', color: '#FFFFFF', borderRadius: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '14px', boxShadow: '0 8px 20px rgba(0, 139, 139, 0.25)', marginTop: '8px' }}>
            {isSignUp ? '🌴 가입하고 떠나기' : '🌊 로그인하기'}
          </button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'transparent', border: 'none', color: '#FF7F50', marginTop: '20px', width: '100%', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '처음이신가요? 회원가입하기'}
        </button>
      </div>
    );
  }

  const totalPenalty = penalties.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const myRecordForSelectedDate = myRecords.find(r => r.targetDate === selectedDateForDetail);
  const partnerRecordForSelectedDate = partnerRecords.find(r => r.targetDate === selectedDateForDetail);

  return (
    <div style={{ maxWidth: '420px', margin: '0 auto', paddingBottom: '100px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#F4F9F9', minHeight: '100vh', position: 'relative', color: '#2D3748', boxShadow: '0 0 30px rgba(0,0,0,0.08)' }}>
      
      {alertMessage && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#FF7F50', color: '#FFFFFF', padding: '12px 20px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(255,127,80,0.3)', zIndex: 1000, fontWeight: 'bold', fontSize: '12px', border: '1px solid rgba(255,255,255,0.4)' }}>
          {alertMessage}
        </div>
      )}

      {/* 상단 헤더 */}
      <header style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #008B8B 0%, #20B2AA 100%)', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(0, 139, 139, 0.2)', borderBottomLeftRadius: '28px', borderBottomRightRadius: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🌴</span>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '900', letterSpacing: '0.5px' }}>푸켓행 바디 챌린지</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.2)', padding: '6px 14px', borderRadius: '20px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <span style={{ fontSize: '12px' }}>🧳</span>
          <span style={{ fontSize: '12px', fontWeight: '900', color: '#FFFDE7' }}>{myName}님</span>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <main style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activeTab === 'home' && (
          <>
            {/* D-day 카드 */}
            <div style={{ background: 'linear-gradient(135deg, #008B8B 0%, #20B2AA 50%, #FF7F50 100%)', padding: '28px 20px', borderRadius: '28px', color: '#FFFFFF', textAlign: 'center', boxShadow: '0 12px 30px rgba(0, 139, 139, 0.25)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '80px', opacity: '0.15' }}>🍍</div>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: '900', letterSpacing: '1px', color: '#FFFDE7' }}>☀️ PHUKET TRIP COUNTDOWN ☀️</p>
              <h2 style={{ margin: '10px 0', fontSize: '42px', fontWeight: '900', textShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>D-{calculateDday()}</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold' }}>맑고 푸른 야자수 아래의 우리를 위해 오늘도 파이팅! 🌊</p>
            </div>

            {/* 파트너 응원 카드 */}
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '28px', border: '1px solid #E0F2F1', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#008B8B' }}>✨ 응원 타임라인</span>
                <span style={{ fontSize: '11px', background: '#FFF8E1', color: '#F57F17', padding: '4px 12px', borderRadius: '12px', fontWeight: '900', border: '1px solid #FFE082' }}>누적 벌금: {totalPenalty.toLocaleString()}원</span>
              </div>
              <div style={{ background: '#F4F9F9', padding: '16px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', border: '1px solid #E0F2F1' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: '900', fontSize: '13px', color: '#008B8B' }}>💛 {partnerName}님과 함께 항해 중</p>
                  <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#718096', fontWeight: '500' }}>오늘은 경쟁 말고 서로 달콤하게 응원해 주기!</p>
                </div>
                <span style={{ fontSize: '26px' }}>🏄‍♂️</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handlePoke} style={{ flex: 1, padding: '14px', background: '#FF7F50', color: '#FFFFFF', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', fontSize: '12px', boxShadow: '0 6px 15px rgba(255, 127, 80, 0.25)' }}>🥗 식단 응원 콕!</button>
                <button onClick={handlePoke} style={{ flex: 1, padding: '14px', background: '#32CD32', color: '#FFFFFF', border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', fontSize: '12px', boxShadow: '0 6px 15px rgba(50, 205, 50, 0.25)' }}>💪 운동 응원 콕!</button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '900', color: '#008B8B', margin: 0 }}>📅 캘린더</h2>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button onClick={() => changeMonth(-1)} style={{ width: '28px', height: '28px', background: '#FFFFFF', border: '1px solid #B2DFDB', color: '#008B8B', borderRadius: '8px', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>◀</button>
                <span style={{ padding: '4px 10px', background: '#E0F2F1', color: '#008B8B', borderRadius: '8px', fontSize: '11px', fontWeight: '900' }}>{year}.{String(month + 1).padStart(2, '0')}</span>
                <button onClick={() => changeMonth(1)} style={{ width: '28px', height: '28px', background: '#FFFFFF', border: '1px solid #B2DFDB', color: '#008B8B', borderRadius: '8px', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>▶</button>
              </div>
            </div>

            {/* 캘린더 영역 */}
            <div style={{ background: '#FFFFFF', padding: '10px 8px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #E0F2F1' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: '900', fontSize: '10px', color: '#A0AEC0', marginBottom: '6px' }}>
                <span style={{ color: '#E53E3E' }}>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span style={{ color: '#3182CE' }}>토</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                {Array.from({ length: firstDay }).map((_, idx) => (
                  <div key={`empty-${idx}`} style={{ minHeight: '52px', background: '#F7FAFC', borderRadius: '8px' }}></div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const formattedMonth = String(month + 1).padStart(2, '0');
                  const formattedDay = String(dayNum).padStart(2, '0');
                  const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

                  const myRec = myRecords.find(r => r.targetDate === dateStr);
                  const partnerRec = partnerRecords.find(r => r.targetDate === dateStr);
                  const hasAnyRecord = myRec || partnerRec;

                  return (
                    <div 
                      key={dateStr} 
                      onClick={() => setSelectedDateForDetail(dateStr)}
                      style={{ 
                        minHeight: '52px', 
                        background: hasAnyRecord ? '#FFFFFF' : '#F8FBFB', 
                        border: '1px solid #E0F2F1', 
                        borderRadius: '8px', 
                        padding: '2px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'flex-start', 
                        boxSizing: 'border-box', 
                        overflow: 'hidden',
                        cursor: 'pointer' 
                      }}
                    >
                      <div style={{ fontSize: '9px', fontWeight: '900', color: '#008B8B', marginBottom: '1px', textAlign: 'center' }}>{dayNum}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '8px', fontWeight: '900' }}>
                        
                        <div style={{ padding: '1px', borderRadius: '3px', textAlign: 'center', background: myRec ? (myRec.status === '성공' ? '#E0F2F1' : myRec.status === '야자수 데이' ? '#FFF8E1' : '#FFEBEE') : 'transparent', color: myRec ? (myRec.status === '성공' ? '#00695C' : myRec.status === '야자수 데이' ? '#F57F17' : '#C62828') : '#CBD5E0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          나:{myRec ? (myRec.status === '성공' ? '✅' : myRec.status === '야자수 데이' ? '🌴' : '❌') : '-'}
                        </div>

                        <div style={{ padding: '1px', borderRadius: '3px', textAlign: 'center', background: partnerRec ? (partnerRec.status === '성공' ? '#E0F2F1' : partnerRec.status === '야자수 데이' ? '#FFF8E1' : '#FFEBEE') : 'transparent', color: partnerRec ? (partnerRec.status === '성공' ? '#00695C' : partnerRec.status === '야자수 데이' ? '#F57F17' : '#C62828') : '#CBD5E0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {partnerName}:{partnerRec ? (partnerRec.status === '성공' ? '✅' : partnerRec.status === '야자수 데이' ? '🌴' : '❌') : '-'}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'record' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '900', color: '#008B8B', margin: 0, paddingLeft: '4px' }}>📝 상큼한 미션 기록하기</h2>
            
            <div>
              <label style={{ fontSize: '11px', fontWeight: '900', color: '#008B8B', display: 'block', marginBottom: '6px' }}>📅 인증 날짜 선택</label>
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid #B2DFDB', fontSize: '12px', background: '#FFFFFF', fontWeight: '900', color: '#008B8B', boxSizing: 'border-box', outline: 'none' }} />
            </div>

            {/* 식단 인증과 운동 인증 가로 배치 */}
            <div style={{ display: 'flex', gap: '10px' }}>
              
              {/* 식단 인증 카드 */}
              <div style={{ flex: 1, background: '#FFFFFF', padding: '14px', borderRadius: '20px', border: '1px solid #E0F2F1', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: 0, color: '#FF7F50', fontWeight: '900', fontSize: '11px' }}>🥗 식단 인증</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[
                    ['성공', '✅ 성공', '#008B8B', '#E0F2F1'],
                    ['실패', '❌ 실패', '#E53E3E', '#FFEBEE'],
                    ['야자수 데이', '🌴 야자수', '#D97706', '#FFF8E1']
                  ].map(([val, label, activeColor, activeBg]) => {
                    const isSelected = dietStatus === val;
                    return (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setDietStatus(val)}
                        style={{
                          width: '100%',
                          padding: '8px 4px',
                          borderRadius: '10px',
                          border: isSelected ? `2px solid ${activeColor}` : '1px solid #E0F2F1',
                          background: isSelected ? activeBg : '#F8FBFB',
                          color: isSelected ? activeColor : '#718096',
                          fontWeight: '900',
                          fontSize: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <textarea placeholder="식단 메모" value={dietMemo} onChange={(e) => setDietMemo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid #B2DFDB', height: '40px', fontSize: '10px', resize: 'none', background: '#F8FBFB', boxSizing: 'border-box', outline: 'none' }} />
                
                {/* 실시간 미리보기 및 클릭 시 확대 기능이 포함된 식단 사진 업로드 */}
                <div>
                  <label style={{ display: 'block', width: '100%', padding: '10px', background: '#E0F2F1', color: '#00695C', borderRadius: '10px', textAlign: 'center', fontWeight: '900', fontSize: '10px', cursor: 'pointer', border: '1px dashed #008B8B', boxSizing: 'border-box' }}>
                    📸 식단 사진 추가 ({dietPhotoUrls.length}장)
                    <input type="file" accept="image/*" multiple onChange={handleDietImagesUpload} style={{ display: 'none' }} />
                  </label>
                  {uploadingDietImage && <p style={{ fontSize: '9px', color: '#008B8B', margin: '2px 0', textAlign: 'center' }}>압축 및 미리보기 생성 중...</p>}
                  
                  {dietPhotoUrls.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {dietPhotoUrls.map((url, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                          <img 
                            src={url} 
                            alt="식단미리보기" 
                            onClick={() => setModalImageSrc(url)}
                            style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #008B8B', cursor: 'pointer' }} 
                          />
                          <button type="button" onClick={() => setDietPhotoUrls(dietPhotoUrls.filter((_, i) => i !== index))} style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#E53E3E', color: '#FFF', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="button" onClick={handleSaveDiet} style={{ width: '100%', padding: '10px', background: '#008B8B', color: '#FFFFFF', borderRadius: '10px', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '11px' }}>식단 저장</button>
              </div>

              {/* 운동 인증 카드 */}
              <div style={{ flex: 1, background: '#FFFFFF', padding: '14px', borderRadius: '20px', border: '1px solid #E0F2F1', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ margin: 0, color: '#32CD32', fontWeight: '900', fontSize: '11px' }}>💪 운동 인증</h4>
                
                <input type="text" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} placeholder="운동 종류" style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid #C8E6C9', fontSize: '10px', background: '#F8FBFB', boxSizing: 'border-box', outline: 'none' }} />
                <input type="text" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="시간 (분)" style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid #C8E6C9', fontSize: '10px', background: '#F8FBFB', boxSizing: 'border-box', outline: 'none' }} />
                <textarea placeholder="운동 메모" value={workoutMemo} onChange={(e) => setWorkoutMemo(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid #C8E6C9', height: '40px', fontSize: '10px', resize: 'none', background: '#F8FBFB', boxSizing: 'border-box', outline: 'none' }} />
                
                {/* 실시간 미리보기 및 클릭 시 확대 기능이 포함된 운동 사진 업로드 */}
                <div>
                  <label style={{ display: 'block', width: '100%', padding: '10px', background: '#E8F5E9', color: '#2E7D32', borderRadius: '10px', textAlign: 'center', fontWeight: '900', fontSize: '10px', cursor: 'pointer', border: '1px dashed #32CD32', boxSizing: 'border-box' }}>
                    📸 운동 인증샷 ({workoutPhotoUrls.length}장)
                    <input type="file" accept="image/*" multiple onChange={handleWorkoutImagesUpload} style={{ display: 'none' }} />
                  </label>
                  {uploadingWorkoutImage && <p style={{ fontSize: '9px', color: '#32CD32', margin: '2px 0', textAlign: 'center' }}>압축 및 미리보기 생성 중...</p>}
                  
                  {workoutPhotoUrls.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {workoutPhotoUrls.map((url, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                          <img 
                            src={url} 
                            alt="운동미리보기" 
                            onClick={() => setModalImageSrc(url)}
                            style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #32CD32', cursor: 'pointer' }} 
                          />
                          <button type="button" onClick={() => setWorkoutPhotoUrls(workoutPhotoUrls.filter((_, i) => i !== index))} style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#E53E3E', color: '#FFF', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="button" onClick={handleSaveWorkout} style={{ width: '100%', padding: '10px', background: '#32CD32', color: '#FFFFFF', borderRadius: '10px', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '11px' }}>운동 저장</button>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '900', color: '#008B8B', margin: 0, paddingLeft: '4px' }}>⚙️ 설정 및 계정 정보</h2>
            <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '28px', border: '1px solid #E0F2F1', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '11px', color: '#A0AEC0', fontWeight: 'bold' }}>현재 로그인 계정</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: '900', color: '#008B8B' }}>{currentUser.email}</p>
              </div>
              <button onClick={handleLogout} style={{ width: '100%', padding: '14px', background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7', borderRadius: '16px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' }}>로그아웃하기 🚪</button>
            </div>
          </div>
        )}
      </main>

      {/* 캘린더 날짜별 상세 모달 (클릭 시 사진 확대 기능 적용) */}
      {selectedDateForDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: '#FFFFFF', width: '100%', maxWidth: '360px', padding: '24px', borderRadius: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', maxHeight: '85vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: '#008B8B' }}>📅 {selectedDateForDetail} 인증 현황</h3>
              <button onClick={() => setSelectedDateForDetail(null)} style={{ background: 'transparent', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', color: '#A0AEC0' }}>✕</button>
            </div>
            
            {/* 내 기록 섹션 */}
            <div style={{ background: '#F8FBFB', padding: '14px', borderRadius: '16px', border: '1px solid #E0F2F1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#008B8B' }}>🧳 내 기록 ({myName})</span>
                {myRecordForSelectedDate && (
                  <button onClick={() => handleDeleteRecord(myRecordForSelectedDate.id)} style={{ background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7', borderRadius: '6px', fontSize: '9px', fontWeight: 'bold', padding: '3px 6px', cursor: 'pointer' }}>삭제</button>
                )}
              </div>

              {myRecordForSelectedDate ? (
                <>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#2D3748' }}>
                    상태/종류: <span style={{ color: '#008B8B' }}>{myRecordForSelectedDate.status}</span>
                    {myRecordForSelectedDate.workoutType && ` (${myRecordForSelectedDate.workoutType}, ${myRecordForSelectedDate.durationMinutes}분)`}
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#4A5568' }}>메모: {myRecordForSelectedDate.memo || '메모 없음'}</p>
                  
                  {/* 내 식단 사진 (클릭 확대) */}
                  {myRecordForSelectedDate.photoUrls && myRecordForSelectedDate.photoUrls.length > 0 && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: '900', color: '#FF7F50', margin: '4px 0 2px 0' }}>🥗 식단 사진 (클릭시 확대)</p>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {myRecordForSelectedDate.photoUrls.map((url, i) => (
                          <img 
                            key={i} 
                            src={url} 
                            alt="내식단" 
                            onClick={() => setModalImageSrc(url)}
                            style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E0F2F1', cursor: 'pointer' }} 
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 내 운동 사진 (클릭 확대) */}
                  {myRecordForSelectedDate.workoutPhotoUrls && myRecordForSelectedDate.workoutPhotoUrls.length > 0 && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: '900', color: '#32CD32', margin: '4px 0 2px 0' }}>💪 운동 사진 (클릭시 확대)</p>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {myRecordForSelectedDate.workoutPhotoUrls.map((url, i) => (
                          <img 
                            key={i} 
                            src={url} 
                            alt="내운동" 
                            onClick={() => setModalImageSrc(url)}
                            style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E0F2F1', cursor: 'pointer' }} 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '11px', color: '#A0AEC0', fontStyle: 'italic' }}>작성된 기록이 없습니다.</p>
              )}
            </div>

            {/* 상대방 기록 섹션 */}
            <div style={{ background: '#FFFDF9', padding: '14px', borderRadius: '16px', border: '1px solid #FFE082', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#D97706' }}>💛 {partnerName}님의 기록</span>

              {partnerRecordForSelectedDate ? (
                <>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#2D3748' }}>
                    상태/종류: <span style={{ color: '#D97706' }}>{partnerRecordForSelectedDate.status}</span>
                    {partnerRecordForSelectedDate.workoutType && ` (${partnerRecordForSelectedDate.workoutType}, ${partnerRecordForSelectedDate.durationMinutes}분)`}
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#4A5568' }}>메모: {partnerRecordForSelectedDate.memo || '메모 없음'}</p>
                  
                  {/* 상대방 식단 사진 (클릭 확대) */}
                  {partnerRecordForSelectedDate.photoUrls && partnerRecordForSelectedDate.photoUrls.length > 0 && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: '900', color: '#FF7F50', margin: '4px 0 2px 0' }}>🥗 식단 사진 (클릭시 확대)</p>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {partnerRecordForSelectedDate.photoUrls.map((url, i) => (
                          <img 
                            key={i} 
                            src={url} 
                            alt="상대식단" 
                            onClick={() => setModalImageSrc(url)}
                            style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #FFE082', cursor: 'pointer' }} 
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 상대방 운동 사진 (클릭 확대) */}
                  {partnerRecordForSelectedDate.workoutPhotoUrls && partnerRecordForSelectedDate.workoutPhotoUrls.length > 0 && (
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: '900', color: '#32CD32', margin: '4px 0 2px 0' }}>💪 운동 사진 (클릭시 확대)</p>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {partnerRecordForSelectedDate.workoutPhotoUrls.map((url, i) => (
                          <img 
                            key={i} 
                            src={url} 
                            alt="상대운동" 
                            onClick={() => setModalImageSrc(url)}
                            style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #FFE082', cursor: 'pointer' }} 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '11px', color: '#A0AEC0', fontStyle: 'italic' }}>작성된 기록이 없습니다.</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 사진 크게 보기 전체 화면 팝업 모달 */}
      {modalImageSrc && (
        <div 
          onClick={() => setModalImageSrc(null)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px', boxSizing: 'border-box', cursor: 'pointer' }}
        >
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <img 
              src={modalImageSrc} 
              alt="확대된인증샷" 
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
            />
            <button 
              onClick={() => setModalImageSrc(null)}
              style={{ position: 'absolute', top: '-12px', right: '-12px', background: '#FFFFFF', color: '#2D3748', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 바 */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '420px', background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(10px)', borderTop: '1px solid #E0F2F1', display: 'flex', justifyContent: 'space-around', padding: '10px 0', zIndex: 900, boxShadow: '0 -10px 25px rgba(0,0,0,0.05)', borderTopLeftRadius: '28px', borderTopRightRadius: '28px' }}>
        {[
          ['home', '🏠 홈'], 
          ['calendar', '📅 캘린더'], 
          ['record', '📝 기록'], 
          ['settings', '⚙️ 설정']
        ].map(([tab, label]) => {
          const isActive = activeTab === tab;
          return (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              style={{ background: isActive ? '#E0F2F1' : 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '8px 16px', borderRadius: '16px', color: isActive ? '#008B8B' : '#A0AEC0', fontWeight: isActive ? '900' : 'bold', transform: isActive ? 'scale(1.05)' : 'scale(1)' }}
            >
              <span style={{ fontSize: '14px' }}>{label.split(' ')[0]}</span>
              <span style={{ fontSize: '10px' }}>{label.split(' ')[1]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}