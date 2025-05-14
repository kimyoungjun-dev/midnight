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


interface Chat {
  id: number;
  title: string;
}

// Define a more specific type for message types for better type safety
type MessageType = 'text' | 'image' | 'text_with_image' | 'bot_story_with_image';

interface Message {
  id: number;
  type: MessageType;
  content: string; // For 'text', user's 'text_with_image', bot's diary text in 'bot_story_with_image'
  sender: 'user' | 'bot';
  originalImage?: string; // For bot 'image' type (context) or potentially user's original in future
  file?: File; // For user 'image' or 'text_with_image'
  imageUrl?: string; // For bot 'image' (main image) or 'bot_story_with_image' (transformed image)
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
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(false);
  };

  const handleSendMessage = async () => { 
    const userMessageText = inputText.trim();
    let userMessageSent = false;
    let userMessageForApi = "";
    let isImageAndTextCase = false; // Flag for the new combined case

    const newUiMessages: Message[] = [];

    if (selectedFile && userMessageText) {
      const newUserMessage: Message = {
        id: Date.now(),
        type: 'text_with_image', 
        content: userMessageText,
        sender: 'user',
        file: selectedFile,
      };
      newUiMessages.push(newUserMessage);
      userMessageSent = true;
      userMessageForApi = userMessageText; // Keep for consistency, actual prompt for this case is handled by API
      isImageAndTextCase = true; // Set flag for new API call path
    } else if (userMessageText && !selectedFile) { // Text only
      const newUserMessage: Message = { id: Date.now(), type: 'text', content: userMessageText, sender: 'user' };
      newUiMessages.push(newUserMessage);
      userMessageForApi = userMessageText;
      userMessageSent = true;
    } else if (selectedFile) {
      const newUserMessage: Message = { 
        id: Date.now(), 
        type: 'image', 
        content: URL.createObjectURL(selectedFile), 
        sender: 'user', 
        file: selectedFile 
      };
      newUiMessages.push(newUserMessage);
      setMessages(prevMessages => [...prevMessages, ...newUiMessages]);
      setInputText('');
      setImagePreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return; 
    }

    if (!userMessageSent && !isImageAndTextCase) { // Adjusted condition
      return; 
    }

    setMessages(prevMessages => [...prevMessages, ...newUiMessages]);
    const currentInputText = userMessageText; // Capture before clearing
    const currentSelectedFile = selectedFile; // Capture before clearing

    setInputText('');
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    setIsLoading(true); // 로딩 시작은 fetch 호출 직전이 아닌, 사용자 액션 직후 UI 업데이트를 위해 여기 유지

    // try {
    //     const response = await fetch('/api/transform-image', {
    //         method: 'POST',
    //         body: formData, // No 'Content-Type' header needed, browser sets it for FormData
    //     });

    //     console.log("Transform Image API Response:", response);

    //     // setIsLoading(false); // 실제 API 호출 시에는 여기서 로딩 종료

    //     if (!response.ok) {
    //         const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
    //         console.error('Transform Image API Error:', errorData.error || response.statusText);
    //         const botErrorMessage: Message = {
    //             id: Date.now() + 1, 
    //             type: 'text',
    //             content: `이미지 변환 중 오류: ${errorData.error || response.statusText}`,
    //             sender: 'bot',
    //         };
    //         setMessages(prevMessages => [...prevMessages, botErrorMessage]);
    //         setIsLoading(false); // 오류 발생 시에도 로딩 종료
    //         return;
    //     }

    //     const data = await response.json();
    //     const botMessage: Message = {
    //         id: Date.now() + 1, 
    //         type: 'bot_story_with_image', // New message type
    //         sender: 'bot',
    //         content: data.diaryText,          // Diary text from API
    //         imageUrl: data.transformedImageUrl // Transformed image URL from API
    //     };
    //     setMessages(prevMessages => [...prevMessages, botMessage]);
    //     setIsLoading(false); // 성공 시 로딩 종료

    // } catch (error) {
    //     setIsLoading(false); 
    //     console.error('Failed to transform image:', error);
    //     const botErrorMessage: Message = {
    //         id: Date.now() + 1, 
    //         type: 'text',
    //         content: '이미지 변환 요청 중 문제가 발생했습니다.',
    //         sender: 'bot',
    //     };
    //     setMessages(prevMessages => [...prevMessages, botErrorMessage]);
    // }

    // 2초 후 더미 데이터 표시 로직 (기존 try-catch 블록 대체)
    setTimeout(() => {
        const dummyBotMessage: Message = {
            id: Date.now() + 1,
            type: 'bot_story_with_image',
            sender: 'bot',
            content: "짜잔! 멋진 그림이 완성되었어요! 이 이야기는...", // 더미 텍스트
            imageUrl: "/placeholder-image.png" // 요청하신 이미지 URL로 변경
        };
        setMessages(prevMessages => [...prevMessages, dummyBotMessage]);
        setIsLoading(false); // 더미 데이터 표시 후 로딩 종료
    }, 2000);

    if (isImageAndTextCase && currentSelectedFile && currentInputText) {

        const formData = new FormData();
        formData.append('image', currentSelectedFile);
        formData.append('prompt', currentInputText);

        console.log("Transform Image API Form Data (raw object):", formData);
        // FormData 내용을 확인하기 위한 상세 로그 추가
        console.log("Inspecting FormData entries:");
        for (let [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`FormData entry: ${key} = File { name: '${value.name}', size: ${value.size}, type: '${value.type}' }`);
          } else {
            console.log(`FormData entry: ${key} = ${value}`);
          }
        }

        // try {
        //     const response = await fetch('/api/transform-image', {
        //         method: 'POST',
        //         body: formData, // No 'Content-Type' header needed, browser sets it for FormData
        //     });

        //     console.log("Transform Image API Response:", response);

        //     setIsLoading(false);

        //     if (!response.ok) {
        //         const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        //         console.error('Transform Image API Error:', errorData.error || response.statusText);
        //         const botErrorMessage: Message = {
        //             id: Date.now() + 1, 
        //             type: 'text',
        //             content: `이미지 변환 중 오류: ${errorData.error || response.statusText}`,
        //             sender: 'bot',
        //         };
        //         setMessages(prevMessages => [...prevMessages, botErrorMessage]);
        //         return;
        //     }

        //     const data = await response.json();
        //     const botMessage: Message = {
        //         id: Date.now() + 1, 
        //         type: 'bot_story_with_image', // New message type
        //         sender: 'bot',
        //         content: data.diaryText,          // Diary text from API
        //         imageUrl: data.transformedImageUrl // Transformed image URL from API
        //     };
        //     setMessages(prevMessages => [...prevMessages, botMessage]);

        // } catch (error) {
        //     setIsLoading(false); 
        //     console.error('Failed to transform image:', error);
        //     const botErrorMessage: Message = {
        //         id: Date.now() + 1, 
        //         type: 'text',
        //         content: '이미지 변환 요청 중 문제가 발생했습니다.',
        //         sender: 'bot',
        //     };
        //     setMessages(prevMessages => [...prevMessages, botErrorMessage]);
        // }

    } else if (userMessageForApi && !currentSelectedFile) {
        // Existing path: Call /api/generate-story for text-only messages
        try {
            const response = await fetch('/api/generate-story', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: userMessageForApi }),
            });

            setIsLoading(false);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData.error);
                const botErrorMessage: Message = {
                    id: Date.now() + 1,
                    type: 'text',
                    content: `오류가 발생했습니다: ${errorData.error || response.statusText}`,
                    sender: 'bot',
                };
                setMessages(prevMessages => [...prevMessages, botErrorMessage]);
                return;
            }

            const data = await response.json();
            const botMessage: Message = {
                id: Date.now() + 1,
                type: 'text',
                content: data.story,
                sender: 'bot',
            };
            setMessages(prevMessages => [...prevMessages, botMessage]);

        } catch (error) {
            setIsLoading(false);
            console.error('Failed to send message:', error);
            const botErrorMessage: Message = {
                id: Date.now() + 1,
                type: 'text',
                content: '메시지 전송 중 오류가 발생했습니다.',
                sender: 'bot',
            };
            setMessages(prevMessages => [...prevMessages, botErrorMessage]);
        }
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
                        setMessages([]);
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
                {msg.type === 'text' && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                {msg.type === 'image' && (
                  <div className="space-y-2">
                    {msg.sender === 'bot' && msg.originalImage && (
                       <div className="p-2 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1.5">원본 이미지:</p>
                          <Image src={msg.originalImage} alt="Original context" width={150} height={150} className="rounded-md object-cover"/>
                       </div>
                    )}
                    <Image 
                      src={msg.file ? URL.createObjectURL(msg.file) : msg.imageUrl || '/placeholder-image.png'} 
                      alt="Chat image" 
                      width={200} 
                      height={200} 
                      className="rounded-md object-cover" 
                      onError={(e) => (e.currentTarget.src = '/placeholder-image.png')} // Fallback for broken images
                    />
                  </div>
                )}
                {msg.type === 'text_with_image' && (
                  <div className="space-y-2">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {/* For user message, msg.file will exist. For bot, potentially msg.imageUrl */}
                    {msg.file ? (
                        <Image src={URL.createObjectURL(msg.file)} alt="User uploaded image" width={200} height={200} className="rounded-md object-cover"/>
                    ) : msg.imageUrl ? (
                        <Image src={msg.imageUrl} alt="Bot provided image" width={200} height={200} className="rounded-md object-cover" onError={(e) => (e.currentTarget.src = '/placeholder-image.png')}/>
                    ) : null}
                  </div>
                )}
                {/* New rendering logic for bot_story_with_image */}
                {msg.type === 'bot_story_with_image' && msg.sender === 'bot' && (
                  <div className="space-y-2">
                    {msg.imageUrl && (
                      <Image 
                        src={msg.imageUrl} 
                        alt="Transformed image by AI" 
                        width={250} // Slightly larger for transformed image
                        height={250} 
                        className="rounded-md object-cover" 
                        onError={(e) => (e.currentTarget.src = '/placeholder-image.png')} // Fallback
                      />
                    )}
                    <p className="text-sm whitespace-pre-wrap pt-2">{msg.content}</p> {/* Diary text */}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-5 border-t border-gray-200 bg-white">
          {isLoading && (
            <div className="mb-2 text-sm text-gray-500 flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              AI가 동화를 만들고 있어요...
            </div>
          )}
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
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
              placeholder="메시지를 입력하거나 이미지를 첨부하세요..." 
              className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-sm"
              disabled={isLoading}
            />
            <button 
              onClick={handleSendMessage}
              className="p-2.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
              disabled={(!inputText.trim() && !selectedFile) || isLoading}
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
