'use client'
import Image from "next/image";
import { useEffect, useState, useRef } from 'react';

// 임시 API 함수 (더미 데이터 반환)
async function fetchChatHistory() {
  return Promise.resolve([
    { id: 1, title: '강아지 사진 변환' },
    { id: 2, title: '새로운 대화' },
  ]);
}

async function fetchInitialMessages(): Promise<Message[]> {
  return Promise.resolve([
    { id: 1, type: 'text', content: '강아지 사진을 그림으로 만들어줘', sender: 'user' },
    { id: 2, type: 'image', content: '/sample-dog.jpg', sender: 'bot', originalImage: '/original-dog.jpg' },
  ]);
}

interface Chat {
  id: number;
  title: string;
}

interface Message {
  id: number;
  type: 'text' | 'image' | 'text_with_image';
  content: string;
  sender: 'user' | 'bot';
  originalImage?: string;
  file?: File;
}

export default function HomePage() {
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 더미 API 호출
    fetchChatHistory().then(history => {
      setChatHistory(history);
      if (history.length > 0) {
        setActiveChatId(history[0].id);
      }
    });
    fetchInitialMessages().then(setMessages);
  }, []);

  const handleNewChat = () => {
    const newChatId = Date.now();
    const newChatItem: Chat = { id: newChatId, title: '새로운 대화' };
    setChatHistory([newChatItem, ...chatHistory]);
    setMessages([]);
    setInputText('');
    setImagePreview(null);
    setSelectedFile(null);
    setActiveChatId(newChatId);
  };

  const handleSendMessage = () => {
    const newMessages: Message[] = [];
    let messageSent = false;

    if (selectedFile && inputText.trim()) {
      newMessages.push({
        id: Date.now(),
        type: 'text_with_image',
        content: inputText,
        sender: 'user',
        file: selectedFile,
      });
      messageSent = true;
    } else if (inputText.trim()) {
      newMessages.push({ id: Date.now(), type: 'text', content: inputText, sender: 'user' });
      messageSent = true;
    } else if (selectedFile) {
      newMessages.push({ id: Date.now(), type: 'image', content: URL.createObjectURL(selectedFile), sender: 'user', file: selectedFile });
      messageSent = true;
    }

    if (messageSent) {
      setMessages([...messages, ...newMessages]);
      setInputText('');
      setImagePreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden">
      {/* Responsive Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 bg-gray-50 flex flex-col justify-between border-r border-gray-200
          transform transition-all duration-300 ease-in-out
          w-72  /* 너비는 항상 72로 고정하고 transform으로 제어 */
          ${isSidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'}
          md:relative md:translate-x-0 
          ${isSidebarOpen ? 'md:w-72 md:p-5' : 'md:w-0 md:p-0 md:border-none md:overflow-hidden'}
        `}
      >
        {/* 사이드바 내용 - isSidebarOpen일 때만 표시되도록 하여 애니메이션과 컨텐츠 관리 용이 */}
        {isSidebarOpen && (
          <>
            <div>
              <div className="flex justify-between items-center mb-6 p-5 md:p-0"> {/* 모바일에서는 패딩 유지, 데스크탑에서는 제거(부모 패딩 사용) */}
                <h1 className="text-2xl font-semibold text-gray-900">대화 목록</h1>
                <button
                  onClick={handleNewChat}
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  title="새로운 대화 시작"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>
              <ul className="space-y-2 px-5 md:px-0"> {/* 모바일에서는 패딩 유지 */}
                {chatHistory.map((chat) => (
                  <li
                    key={chat.id}
                    className={`p-3 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors ${chat.id === activeChatId ? 'bg-gray-200 font-medium' : ''}`}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      if (chat.id === 1) {
                        fetchInitialMessages().then(setMessages);
                      } else {
                        setMessages([]);
                      }
                      if (window.innerWidth < 768) { // 모바일에서 항목 선택 시 사이드바 닫기
                        setIsSidebarOpen(false);
                      }
                    }}
                  >
                    {chat.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-5 md:p-0 flex space-x-2"> {/* 모바일에서는 패딩 유지 */}
              <button className="flex-1 p-3 rounded-lg hover:bg-gray-200 border border-gray-300 text-sm transition-colors">History</button>
              <button className="flex-1 p-3 rounded-lg bg-black text-white text-sm transition-colors">Main</button>
            </div>
          </>
        )}
      </aside>

      {/* Backdrop for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0"> {/* min-w-0 추가 */}
        {/* Header */}
        <header className="flex items-center p-3 md:p-5 border-b border-gray-200 space-x-3 md:space-x-4">
          {/* Mobile Toggle Button (Hamburger/X) */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors md:hidden"
            title={isSidebarOpen ? "사이드바 닫기" : "메뉴 열기"}
          >
            {isSidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-700">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-700">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>

          {/* Desktop Toggle Button (Chevrons) */}
          <button
            onClick={toggleSidebar}
            className="hidden md:block p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={isSidebarOpen ? "사이드바 접기" : "사이드바 펼치기"}
          >
            {isSidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-700">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-700">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" />
              </svg>
            )}
          </button>

          <div className="flex-1 flex justify-between items-center">
            <div className="hidden sm:block"> {/* 화면 작을 시 숨김 처리 */}
              <span className="font-semibold text-gray-900">WALWAL</span>
            </div>
            <div className="flex items-center space-x-3 md:space-x-5">
              {/* <button className="hidden sm:block text-sm text-yellow-600 hover:text-yellow-700 transition-colors">Upgrade Plan ✨</button> */}
              <button className="hidden md:block text-sm text-gray-600 hover:text-gray-800 transition-colors">Help❓</button> {/* md 이상에서만 보이도록 */}
              <button className="hidden md:block text-sm text-gray-600 hover:text-gray-800 transition-colors">API 🔗</button> {/* md 이상에서만 보이도록 */}
              <div className="flex items-center">
                <span className="bg-gray-700 text-white text-xs rounded-full h-7 w-7 flex items-center justify-center mr-2 font-semibold">GG</span>
                <span className="hidden sm:block text-sm text-gray-700">Greg Gregor</span> {/* 화면 작을 시 이름 숨김 */}
              </div>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-100">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-md lg:max-w-lg p-3.5 rounded-xl shadow-sm ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
                {msg.type === 'text' && <p className="text-sm">{msg.content}</p>}
                {msg.type === 'image' && (
                  <div className="space-y-2">
                    {msg.sender === 'bot' && msg.originalImage && (
                       <div className="p-2 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1.5">원본 이미지:</p>
                          <Image src={msg.originalImage} alt="Original" width={150} height={150} className="rounded-md object-cover"/>
                       </div>
                    )}
                    <Image src={msg.content} alt="Chat image" width={200} height={200} className="rounded-md object-cover"/>
                  </div>
                )}
                {msg.type === 'text_with_image' && (
                  <div className="space-y-2">
                    <p className="text-sm">{msg.content}</p>
                    {msg.file && <Image src={URL.createObjectURL(msg.file)} alt="Chat image" width={200} height={200} className="rounded-md object-cover"/>}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-5 border-t border-gray-200 bg-white">
          {imagePreview && (
            <div className="mb-3 p-2 border border-gray-200 rounded-lg inline-block">
              <Image src={imagePreview} alt="Preview" width={100} height={100} className="rounded-md object-cover"/>
              <button 
                onClick={() => { 
                  setImagePreview(null); 
                  setSelectedFile(null); 
                  if(fileInputRef.current) fileInputRef.current.value = ""; 
                }}
                className="mt-1 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                제거
              </button>
            </div>
          )}
          <div className="flex items-center space-x-3">
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            <button 
              onClick={triggerFileInput}
              className="p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors border border-gray-300"
              title="이미지 첨부"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3.375 3.375 0 1 1 18.374 7.5l-1.578 1.578m0 0L9.232 9.232m9.142 3.507a4.5 4.5 0 0 1-6.364 6.364L3 12.739m18.375 0c.39.39.39 1.023 0 1.414L18.375 12.739Zm0 0c.39.39.39 1.023 0 1.414L18.375 12.739Z" />
              </svg>
            </button>
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="메시지를 입력하거나 이미지를 첨부하세요..." 
              className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-sm"
            />
            <button 
              onClick={handleSendMessage}
              className="p-2.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
              disabled={!inputText.trim() && !selectedFile}
              title="전송"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
