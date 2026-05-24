export type ThreadType = 'local' | 'remote' | 'interest';
export type ThreadStatus = 'open' | 'closed' | 'expired';

export interface Thread {
  id: string;
  title: string;
  body: string;
  type: ThreadType;
  category: string;
  tags: string[];
  isPaid: boolean;
  amount?: number;
  distance?: string;
  status: ThreadStatus;
  responseCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    rating: number;
  };
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export { POST_CATEGORIES as CATEGORIES } from '@template/web/categories';

export const NEARBY_THREADS: Thread[] = [
  {
    id: '1',
    title: 'Anyone up for a night walk near Koramangala?',
    body: 'Looking for someone to walk with tonight around 9pm. No particular destination, just walking and talking. It\'s peaceful and I don\'t like going alone.',
    type: 'local',
    category: 'walking',
    tags: ['walk', 'night', 'casual'],
    isPaid: false,
    distance: '0.4 km',
    status: 'open',
    responseCount: 3,
    createdAt: '12 min ago',
    author: { id: 'u1', name: 'Aryan S.', avatar: 'AS', rating: 4.8 },
  },
  {
    id: '2',
    title: 'Need someone to pick up groceries from DMart',
    body: 'I\'ll share the list. It\'s a small order — milk, bread, and a few vegetables. Please bring to Indiranagar 12th Main. Will pay ₹80 for the effort.',
    type: 'local',
    category: 'delivery',
    tags: ['grocery', 'pickup', 'quick'],
    isPaid: true,
    amount: 80,
    distance: '0.9 km',
    status: 'open',
    responseCount: 1,
    createdAt: '28 min ago',
    author: { id: 'u2', name: 'Priya M.', avatar: 'PM', rating: 4.6 },
  },
  {
    id: '3',
    title: 'Anyone want to hang out this afternoon? I\'m free',
    body: 'Free from 3pm. Can do coffee, bookstore, or just walk around HSR. Not looking for anything specific, just don\'t want to sit home.',
    type: 'local',
    category: 'hangout',
    tags: ['hangout', 'afternoon', 'casual'],
    isPaid: false,
    distance: '1.2 km',
    status: 'open',
    responseCount: 5,
    createdAt: '45 min ago',
    author: { id: 'u3', name: 'Sneha K.', avatar: 'SK', rating: 4.9 },
  },
  {
    id: '4',
    title: 'Fan broken, need a technician today',
    body: 'Ceiling fan stopped working suddenly. Need someone who can fix it today evening. Will pay fairly. Koramangala 5th Block.',
    type: 'local',
    category: 'technician',
    tags: ['repair', 'electrician', 'urgent'],
    isPaid: true,
    amount: 250,
    distance: '1.8 km',
    status: 'open',
    responseCount: 2,
    createdAt: '1 hr ago',
    author: { id: 'u4', name: 'Rohit B.', avatar: 'RB', rating: 4.7 },
  },
  {
    id: '9',
    title: 'Can someone stand in queue at the BBMP office?',
    body: 'Need someone to hold my spot in the queue at BBMP HSR Layout. Will be there in 45 mins. Paying ₹150.',
    type: 'local',
    category: 'queue',
    tags: ['queue', 'bbmp', 'quick'],
    isPaid: true,
    amount: 150,
    distance: '2.1 km',
    status: 'open',
    responseCount: 3,
    createdAt: '20 min ago',
    author: { id: 'u9', name: 'Faizan A.', avatar: 'FA', rating: 4.5 },
  },
  {
    id: '10',
    title: 'Emergency — need someone to drop me to Apollo Hospital',
    body: 'Minor emergency, cab not available. Need a ride to Apollo Jayanagar right now. Will pay ₹300 + fuel. Please urgent.',
    type: 'local',
    category: 'emergency',
    tags: ['emergency', 'ride', 'urgent'],
    isPaid: true,
    amount: 300,
    distance: '0.7 km',
    status: 'open',
    responseCount: 0,
    createdAt: '5 min ago',
    author: { id: 'u10', name: 'Meera S.', avatar: 'MS', rating: 4.2 },
  },
  {
    id: '11',
    title: 'Pet sitting needed this weekend — small dog',
    body: 'Going out of town Sat–Sun. My beagle needs feeding and a short walk twice a day. Very friendly dog. Paying ₹400/day.',
    type: 'local',
    category: 'pet',
    tags: ['pet', 'dog', 'weekend'],
    isPaid: true,
    amount: 800,
    distance: '1.4 km',
    status: 'open',
    responseCount: 4,
    createdAt: '3 hrs ago',
    author: { id: 'u11', name: 'Divya N.', avatar: 'DN', rating: 4.9 },
  },
  {
    id: '12',
    title: 'Buy paracetamol from medical store nearby',
    body: 'Feeling unwell, can\'t step out. Need 2 strips of Crocin 650 from any medical near BTM Layout. Will Gpay immediately. ₹50 + cost.',
    type: 'local',
    category: 'purchase',
    tags: ['medicine', 'quick', 'nearby'],
    isPaid: true,
    amount: 50,
    distance: '0.6 km',
    status: 'open',
    responseCount: 1,
    createdAt: '10 min ago',
    author: { id: 'u12', name: 'Kiran L.', avatar: 'KL', rating: 4.6 },
  },
];

export const REMOTE_THREADS: Thread[] = [
  {
    id: '5',
    title: 'Can someone write my college assignment? Due tomorrow',
    body: '1500 words on climate change and its impact on developing countries. I\'ll provide all the reference material. Needs to be done by 10pm tonight.',
    type: 'remote',
    category: 'college',
    tags: ['assignment', 'writing', 'urgent'],
    isPaid: true,
    amount: 350,
    status: 'open',
    responseCount: 7,
    createdAt: '2 hrs ago',
    author: { id: 'u5', name: 'Kabir R.', avatar: 'KR', rating: 4.3 },
  },
  {
    id: '6',
    title: 'Is there someone who reads manhwa? Let\'s talk',
    body: 'Just finished Solo Leveling and feeling empty. Looking for someone to geek out with about manhwa/manga. Telegram or Discord is fine.',
    type: 'interest',
    category: 'chat',
    tags: ['manhwa', 'manga', 'fandom'],
    isPaid: false,
    status: 'open',
    responseCount: 12,
    createdAt: '3 hrs ago',
    author: { id: 'u6', name: 'Tanya V.', avatar: 'TV', rating: 5.0 },
  },
  {
    id: '7',
    title: 'Need a quick logo feedback — 10 mins of your time',
    body: 'Working on a logo for my startup. Just need honest design feedback. Will share on Google Meet, takes 10 minutes max. Very much appreciated.',
    type: 'remote',
    category: 'creative',
    tags: ['design', 'feedback', 'quick'],
    isPaid: false,
    status: 'open',
    responseCount: 4,
    createdAt: '4 hrs ago',
    author: { id: 'u7', name: 'Mehul D.', avatar: 'MD', rating: 4.5 },
  },
  {
    id: '8',
    title: 'Looking for a Python tutor for 2 sessions this week',
    body: 'Beginner level. Need help with loops, functions, and basic data structures. Flexible timing, online only. ₹500 per session.',
    type: 'remote',
    category: 'college',
    tags: ['python', 'tutoring', 'coding'],
    isPaid: true,
    amount: 500,
    status: 'open',
    responseCount: 9,
    createdAt: '5 hrs ago',
    author: { id: 'u8', name: 'Aisha F.', avatar: 'AF', rating: 4.4 },
  },
  {
    id: '13',
    title: 'Need someone to translate a Hindi document to English',
    body: 'It\'s a 2-page legal-ish document in Hindi. Need accurate English translation. Not Google Translate level — proper human translation. Paying ₹200.',
    type: 'remote',
    category: 'language',
    tags: ['translation', 'hindi', 'document'],
    isPaid: true,
    amount: 200,
    status: 'open',
    responseCount: 3,
    createdAt: '6 hrs ago',
    author: { id: 'u13', name: 'Neha G.', avatar: 'NG', rating: 4.7 },
  },
  {
    id: '14',
    title: 'Best street food spots near Jayanagar? Local info needed',
    body: 'Just moved to Jayanagar last week. Looking for honest local recommendations — food, grocery, parlour, anything useful. Not Google results.',
    type: 'remote',
    category: 'local-info',
    tags: ['local', 'recommendations', 'food'],
    isPaid: false,
    status: 'open',
    responseCount: 8,
    createdAt: '1 day ago',
    author: { id: 'u14', name: 'Siddharth P.', avatar: 'SP', rating: 4.8 },
  },
];

export const MY_THREADS: Thread[] = [
  {
    id: 'my1',
    title: 'Need help setting up my new laptop',
    body: 'Windows 11, need someone to help with software setup and transfer files from my old MacBook.',
    type: 'local',
    category: 'remote',
    tags: ['laptop', 'tech', 'setup'],
    isPaid: true,
    amount: 200,
    distance: '—',
    status: 'open',
    responseCount: 2,
    createdAt: '1 day ago',
    author: { id: 'me', name: 'You', avatar: 'ME', rating: 4.8 },
  },
  {
    id: 'my2',
    title: 'Anyone want to try the new ramen place?',
    body: 'Going solo feels weird. Anyone in Koramangala want to join for lunch?',
    type: 'local',
    category: 'hangout',
    tags: ['food', 'hangout', 'lunch'],
    isPaid: false,
    distance: '—',
    status: 'closed',
    responseCount: 4,
    createdAt: '3 days ago',
    author: { id: 'me', name: 'You', avatar: 'ME', rating: 4.8 },
  },
];

export const INBOX_CONVERSATIONS = [
  {
    id: 'c1',
    threadTitle: 'Need someone to pick up groceries from DMart',
    otherUser: { name: 'Priya M.', avatar: 'PM' },
    lastMessage: 'Sure! I can be there by 6pm. What\'s the address?',
    time: '2 min ago',
    unread: true,
    threadId: '2',
  },
  {
    id: 'c2',
    threadTitle: 'Can someone write my college assignment?',
    otherUser: { name: 'Kabir R.', avatar: 'KR' },
    lastMessage: 'I can do this. I\'ll send you a sample first.',
    time: '1 hr ago',
    unread: true,
    threadId: '5',
  },
  {
    id: 'c3',
    threadTitle: 'Anyone up for a night walk near Koramangala?',
    otherUser: { name: 'Aryan S.', avatar: 'AS' },
    lastMessage: 'That sounds good. Same spot as yesterday?',
    time: '3 hrs ago',
    unread: false,
    threadId: '1',
  },
  {
    id: 'c4',
    threadTitle: 'Need help setting up my new laptop',
    otherUser: { name: 'Dev P.', avatar: 'DP' },
    lastMessage: 'I have done this before. Can come over tomorrow.',
    time: '1 day ago',
    unread: false,
    threadId: 'my1',
  },
];
