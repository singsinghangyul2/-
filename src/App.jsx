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

// 통계 한 줄(라벨-값)을 표시하는 작은 재사용 컴포넌트
function StatRow({ label, value, valueColor }) {
  return (
    <div style={{ 
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
      padding: '7px 0', borderBottom: '1px solid #F1F5F9' 
    }}>
      <span style={{ fontSize: '11px', color: '#718096', fontWeight: '600' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: '900', color: valueColor || '#2D3748' }}>{value}</span>
    </div>
  );
}

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
  
  // 사진 크게 보기(모달) 및 갤러리 하위 필터 상태 ('all' | 'diet' | 'workout')
  const [modalImageSrc, setModalImageSrc] = useState(null);
  const [gallerySubTab, setGallerySubTab] = useState('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const userEmail = currentUser?.email ? currentUser.email.trim().toLowerCase() : '';
  const isSeungHyun = userEmail === '********@*****.***';
  const partnerEmail = isSeungHyun ? '*******@*****.***' : '********@*****.***';
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

  const allCombinedRecords = [...myRecords, ...partnerRecords].sort((a, b) => {
    return new Date(b.targetDate || b.createdAt) - new Date(a.targetDate || a.createdAt);
  });

  // ── 홈 화면 통계 계산 (원래 데이터로부터 파생값만 계산, 기능 변경 X) ──
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

  const getTodayDietStatus = (records) => {
    const rec = records.find(r => r.targetDate === todayStr && r.status && r.status !== '운동완료');
    return rec ? rec.status : '미입력';
  };
  const myTodayDiet = getTodayDietStatus(myRecords);
  const partnerTodayDiet = getTodayDietStatus(partnerRecords);

  const nowForWeek = new Date(todayStr);
  const weekStart = new Date(nowForWeek);
  weekStart.setDate(nowForWeek.getDate() - nowForWeek.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const countWeeklyWorkouts = (records) => records.filter(r => {
    if (!r.workoutType) return false;
    const d = new Date(r.targetDate);
    return d >= weekStart && d <= weekEnd;
  }).length;
  const myWeeklyWorkoutCount = countWeeklyWorkouts(myRecords);
  const partnerWeeklyWorkoutCount = countWeeklyWorkouts(partnerRecords);

  const calcStreak = (records) => {
    let streak = 0;
    let cursor = new Date(todayStr);
    while (true) {
      const cursorStr = cursor.toLocaleDateString('en-CA');
      const rec = records.find(r => r.targetDate === cursorStr);
      if (rec && rec.status === '성공') {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    return streak;
  };
  const myStreak = calcStreak(myRecords);
  const partnerStreak = calcStreak(partnerRecords);
   return (
    <div style={{ maxWidth: '420px', margin: '0 auto', paddingBottom: '100px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#F4F9F9', minHeight: '100vh', position: 'relative', color: '#2D3748', boxShadow: '0 0 30px rgba(0,0,0,0.08)' }}>
      
      {alertMessage && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#FF7F50', color: '#FFFFFF', padding: '12px 20px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(255,127,80,0.3)', zIndex: 1000, fontWeight: 'bold', fontSize: '12px', border: '1px solid rgba(255,255,255,0.4)' }}>
          {alertMessage}
        </div>
      )}

      {/* 상단 헤더 – 디자인만 변경, 기능 동일 */}
      <header style={{ padding: '20px 24px 16px 24px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#718096', fontWeight: '600' }}>{myName}님, 오늘도 반가워요! 🌴</p>
            <h1 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '900', color: '#2D3748' }}>푸켓행 바디 챌린지</h1>
          </div>
          <button onClick={handleLogout} style={{ background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: '14px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            로그아웃
          </button>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <main style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activeTab === 'home' && (
          <>
            {/* D-day 카드 – 새 느낌으로 */}
            <div style={{ background: 'linear-gradient(135deg, #FFF9E6 0%, #FFFFFF 100%)', padding: '32px 20px', borderRadius: '28px', textAlign: 'center', border: '1px solid #F0EAD6' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#008B8B' }}>푸켓까지</p>
              <h2 style={{ margin: '10px 0', fontSize: '52px', fontWeight: '900', color: '#FF7F50' }}>D-{calculateDday()}</h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#A0AEC0', fontWeight: '600' }}>여행일 · 2026-12-31</p>
            </div>

            {/* 오늘의 우리 – 기존 데이터로 통계 표현 */}
            <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#2D3748', margin: '4px 0 0 4px' }}>오늘의 우리 🏖️</h3>

            <div style={{ display: 'flex', gap: '10px' }}>
              {/* 내 카드 */}
              <div style={{ flex: 1, background: '#FFFFFF', padding: '16px', borderRadius: '20px', border: '2px solid #008B8B' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#2D3748' }}>{myName}</span>
                  <span style={{ fontSize: '10px', background: '#E0F2F1', color: '#008B8B', padding: '3px 10px', borderRadius: '10px', fontWeight: '900' }}>나</span>
                </div>
                <StatRow label="오늘 식단" value={myTodayDiet} valueColor={myTodayDiet === '성공' ? '#008B8B' : '#A0AEC0'} />
                <StatRow label="이번 주 운동" value={`${myWeeklyWorkoutCount}회`} />
                <StatRow label="연속 성공" value={`${myStreak}일`} />
              </div>

              {/* 파트너 카드 */}
              <div style={{ flex: 1, background: '#FFFFFF', padding: '16px', borderRadius: '20px', border: '1px solid #E0F2F1' }}>
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#2D3748' }}>{partnerName}</span>
                </div>
                <StatRow label="오늘 식단" value={partnerTodayDiet} valueColor={partnerTodayDiet === '성공' ? '#008B8B' : '#A0AEC0'} />
                <StatRow label="이번 주 운동" value={`${partnerWeeklyWorkoutCount}회`} />
                <StatRow label="연속 성공" value={`${partnerStreak}일`} />
              </div>
            </div>

            {/* 빠른 기록 – 기존 record 탭으로 이동만 */}
            <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '20px', border: '1px solid #E0F2F1' }}>
              <h4 style={{ margin: '0 0 12px 4px', fontSize: '13px', fontWeight: '900', color: '#2D3748' }}>빠른 기록</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setActiveTab('record')} style={{ flex: 1, padding: '16px', background: '#E9F9EF', color: '#2E7D32', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}>
                  🥗 식단 기록
                </button>
                <button onClick={() => setActiveTab('record')} style={{ flex: 1, padding: '16px', background: '#E8F4FD', color: '#1565C0', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}>
                  🏃 운동 기록
                </button>
              </div>
            </div>

            {/* 찌르기(응원) 카드 – 원래 기능 그대로, 스타일만 살짝 정돈 */}
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

        {/* 여기부터는 원래 코드의 calendar / gallery / record / settings 블록을 그대로 둡니다 */}
        {activeTab === 'calendar' && (
          // 👉 당신이 처음 보냈던 코드의 calendar 부분 전체를 여기에 그대로 유지
          // (이미 원본에 있던 JSX를 그대로 이 위치에 두시면 됩니다)
          <>
            {/* 캘린더 섹션 원본 코드 */}
          </>
        )}

        {activeTab === 'gallery' && (
          <>
            {/* 갤러리 섹션 원본 코드 */}
          </>
        )}

        {activeTab === 'record' && (
          <>
            {/* 기록 섹션 원본 코드 */}
          </>
        )}

        {activeTab === 'settings' && (
          <>
            {/* 설정 섹션 원본 코드 */}
          </>
        )}
      </main>

      {/* 날짜 상세 모달 / 사진 확대 모달 / 하단 네비게이션 – 원본 그대로 */}
      {/* 👉 여기에도 처음 보내주신 모달/네비 코드 전체를 그대로 두시면 됩니다. */}
    </div>
  );
} 