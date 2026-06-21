import ICONS from '../constants/icons';

export const getDynamicData = (isAr) => {
  return {
    categories: [
      { id: 1, name: isAr ? 'الطب النفسي' : 'Psychiatry', icon: ICONS.psychiatry },
      { id: 2, name: isAr ? 'علم النفس' : 'Psychology', icon: ICONS.psychology },
      { id: 3, name: isAr ? 'علاج النطق' : 'Speech Therapy', icon: ICONS.speech },
    ],
    services: [
      { id: 's1', name: isAr ? 'استشارة أولية (20 دقيقة)' : 'Initial Cons. (20 min)' },
      { id: 's2', name: isAr ? 'جلسة علاجية (30 دقيقة)' : 'Therapy Session (30 min)' },
      { id: 's3', name: isAr ? 'جلسة كاملة (50 دقيقة)' : 'Full Session (50 min)' },
    ],
    doctors: [
      { 
        id: 1, 
        name: isAr ? 'د. فاطمة السيد' : 'Dr. Fatima Al-Sayed', 
        specialty: isAr ? 'الطب النفسي' : 'Psychiatry', 
        rating: 4.9, 
        image: 'https://randomuser.me/api/portraits/women/52.jpg', 
        nextSlot: isAr ? 'اليوم، 4:30 م' : 'Today, 4:30 PM', 
        price: '300' 
      },
      { 
        id: 2, 
        name: isAr ? 'د. عمر الرشيد' : 'Dr. Omar Al-Rashid', 
        specialty: isAr ? 'علم النفس' : 'Psychology', 
        rating: 4.8, 
        image: 'https://randomuser.me/api/portraits/men/32.jpg', 
        nextSlot: isAr ? 'غداً، 10:00 ص' : 'Tomorrow, 10:00 AM', 
        price: '250' 
      },
      { 
        id: 3, 
        name: isAr ? 'د. زينب الحربي' : 'Dr. Zainab Al-Harbi', 
        specialty: isAr ? 'علاج النطق' : 'Speech Therapy', 
        rating: 5.0, 
        image: 'https://randomuser.me/api/portraits/women/68.jpg', 
        nextSlot: isAr ? 'الأربعاء، 11:00 ص' : 'Wed, 11:00 AM', 
        price: '200' 
      },
      // Added a 4th doctor for scrolling demo
      { 
        id: 4, 
        name: isAr ? 'د. يوسف الملك' : 'Dr. Yousef Al-Malik', 
        specialty: isAr ? 'الطب النفسي' : 'Psychiatry', 
        rating: 4.7, 
        image: 'https://randomuser.me/api/portraits/men/45.jpg', 
        nextSlot: isAr ? 'الخميس، 09:00 ص' : 'Thu, 09:00 AM', 
        price: '350' 
      },
    ],
    user: isAr ? 'مريم المطيري' : 'Mariam Al-Mutairi'
  };
};