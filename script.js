// 全局变量
let conversations = []; // 存储多个对话
let currentConversationIndex = -1;
let settingsModal;
let apiKey = '';
let apiProvider = 'deepseek';
let systemPrompt = '你是一个有用的AI助手，能够回答用户的各种问题。';
let selectedModel = 'deepseek-chat';
let userName = '我'; // 用户昵称
let botName = 'AI助手'; // AI昵称

// 默认API端点
const DEFAULT_ENDPOINTS = {
    'deepseek': 'https://api.deepseek.com/v1/chat/completions',
    'openai': 'https://api.openai.com/v1/chat/completions'
};

// DOM元素引用
const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');
const settingsBtn = document.getElementById('settingsBtn');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const closeModalBtn = document.querySelector('.close-modal');
const apiKeyInput = document.getElementById('apiKey');
const apiProviderSelect = document.getElementById('apiProvider');
const systemPromptInput = document.getElementById('systemPrompt');
const userNameInput = document.getElementById('userName');
const botNameInput = document.getElementById('botName');
const newChatBtn = document.getElementById('newChatBtn');
const historyList = document.getElementById('historyList');
const exportHistoryBtn = document.getElementById('exportHistoryBtn');
const importHistoryBtn = document.getElementById('importHistoryBtn');
const menuToggleBtn = document.getElementById('menuToggleBtn');
const sidebar = document.querySelector('.sidebar');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    settingsModal = document.getElementById('settingsModal');
    
    // 加载用户设置
    loadSettings();
    
    // 加载历史对话
    loadConversations();
    
    // 创建新对话或加载最近的对话
    if (conversations.length === 0) {
        createNewConversation();
    } else {
        currentConversationIndex = 0;
        displayCurrentConversation();
        renderConversationsList();
    }
    
    // 确保所有DOM元素都已正确加载
    ensureDOMElements();
    
    // 事件监听器
    setupEventListeners();
    
    // 处理键盘事件
    function handleKeyboardVisibility() {
        const viewportHeight = window.innerHeight;
        document.documentElement.style.setProperty('--vh', `${viewportHeight * 0.01}px`);
    }
    
    // 窗口大小改变时更新
    window.addEventListener('resize', handleKeyboardVisibility);
    window.addEventListener('orientationchange', handleKeyboardVisibility);
    
    // 初始化时执行一次
    handleKeyboardVisibility();
    
    // 检测安卓设备并添加类名
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
        document.body.classList.add('android');
        
        // 安卓设备监听resize事件来检测键盘弹出
        let initialWindowHeight = window.innerHeight;
        window.addEventListener('resize', function() {
            // 如果高度减小，可能是键盘弹出
            if (window.innerHeight < initialWindowHeight) {
                // 键盘弹出
                document.body.classList.add('android-keyboard-visible');
                document.querySelector('.chat-container').classList.add('android-keyboard-visible');
                setTimeout(() => scrollToBottom(true), 300);
            } else {
                // 键盘收起
                document.body.classList.remove('android-keyboard-visible');
                document.querySelector('.chat-container').classList.remove('android-keyboard-visible');
                initialWindowHeight = window.innerHeight;
                setTimeout(() => scrollToBottom(true), 300);
            }
        });
    }
    
    // 移动端聚焦优化
    userInput.addEventListener('focus', function() {
        // 添加聚焦状态类
        document.querySelector('.input-area').classList.add('focused');
        
        // 移动端设备检测
        if (window.innerWidth <= 480) {
            // 延迟滚动以确保键盘弹出后再滚动
            setTimeout(() => {
                scrollToBottom(true);
                
                // 安卓设备特别处理
                if (/Android/i.test(navigator.userAgent)) {
                    document.body.classList.add('android-keyboard-visible');
                    document.querySelector('.chat-container').classList.add('android-keyboard-visible');
                    
                    // 安卓特别处理，防止键盘弹出时页面跳动
                    const viewportHeight = window.innerHeight;
                    document.body.style.height = `${viewportHeight}px`;
                    
                    // 再次滚动确保看到最新消息
                    setTimeout(() => {
                        scrollToBottom(true);
                    }, 500);
                } 
                // iOS设备特别处理
                else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                    document.body.classList.add('keyboard-visible');
                    document.querySelector('.chat-container').classList.add('keyboard-visible');
                }
            }, 300);
        }
    });
    
    userInput.addEventListener('blur', function() {
        // 移除聚焦状态类
        document.querySelector('.input-area').classList.remove('focused');
        
        // 移动端设备移除键盘可见状态
        if (window.innerWidth <= 480) {
            if (/Android/i.test(navigator.userAgent)) {
                document.body.classList.remove('android-keyboard-visible');
                document.querySelector('.chat-container').classList.remove('android-keyboard-visible');
                document.body.style.height = '';
                
                // 延迟滚动以确保键盘收起后正确显示
                setTimeout(() => {
                    scrollToBottom(true);
                }, 300);
            }
            else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                document.body.classList.remove('keyboard-visible');
                document.querySelector('.chat-container').classList.remove('keyboard-visible');
            }
        }
    });
});

// 确保DOM元素加载完成并重新获取引用
function ensureDOMElements() {
    // 重新获取可能在初始化时不存在的元素
    if (!menuToggleBtn) {
        menuToggleBtn = document.getElementById('menuToggleBtn');
        console.log('重新获取菜单按钮:', menuToggleBtn);
    }
    
    if (!sidebar) {
        sidebar = document.querySelector('.sidebar');
        console.log('重新获取侧边栏:', sidebar);
    }
    
    if (!userNameInput) {
        userNameInput = document.getElementById('userName');
        console.log('重新获取用户昵称输入框:', userNameInput);
    }
    
    if (!botNameInput) {
        botNameInput = document.getElementById('botName');
        console.log('重新获取机器人昵称输入框:', botNameInput);
    }
    
    // 为了兼容性，直接在这里绑定菜单按钮的点击事件
    if (menuToggleBtn) {
        console.log('直接绑定菜单按钮点击事件');
        menuToggleBtn.addEventListener('click', function(e) {
            console.log('菜单按钮被点击 (直接绑定)');
            e.stopPropagation(); // 阻止事件冒泡
            sidebar.classList.toggle('active');
        });
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 发送消息
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 输入框焦点相关事件
    userInput.addEventListener('focus', () => {
        // 添加焦点类
        document.querySelector('.input-area').classList.add('focused');
        
        // 在移动设备上，输入框获得焦点时滚动到最新消息
        if (window.innerWidth <= 768) {
            // 短暂延迟，确保键盘弹出后再滚动
            setTimeout(() => {
                chatbox.scrollTop = chatbox.scrollHeight;
                
                // 如果是iOS设备，需要特殊处理
                if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                    // iOS设备上滚动可能需要额外处理
                    document.body.scrollTop = 0;
                    document.documentElement.scrollTop = 0;
                }
            }, 300);
        }
    });
    
    userInput.addEventListener('blur', () => {
        // 移除焦点类
        document.querySelector('.input-area').classList.remove('focused');
    });
    
    // 窗口大小变化或设备方向变化时，确保滚动到底部
    window.addEventListener('resize', () => {
        handleResize();
        if (chatbox.childElementCount > 0) {
            chatbox.scrollTop = chatbox.scrollHeight;
        }
    });
    
    // 设备方向变化事件
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            chatbox.scrollTop = chatbox.scrollHeight;
        }, 300);
    });
    
    // 设置弹窗
    settingsBtn.addEventListener('click', openSettingsModal);
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', openSettingsModal);
    }
    closeModalBtn.addEventListener('click', closeSettingsModal);
    saveSettingsBtn.addEventListener('click', saveSettings);
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });
    
    // 自动调整文本框高度
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight < 200) ? `${userInput.scrollHeight}px` : '200px';
        
        // 启用/禁用发送按钮
        sendBtn.disabled = userInput.value.trim() === '';
        
        // 确保输入框高度变化后，聊天内容也相应滚动
        chatbox.scrollTop = chatbox.scrollHeight;
    });
    
    // API设置变化
    modelSelect.addEventListener('change', () => {
        selectedModel = modelSelect.value;
        localStorage.setItem('selectedModel', selectedModel);
    });
    
    // 新对话按钮
    newChatBtn.addEventListener('click', () => {
        if (conversations[currentConversationIndex].messages.length > 0) {
            createNewConversation();
            renderConversationsList();
        }
        
        // 在移动设备上创建新对话后关闭侧边栏
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    });
    
    // 导出/导入历史
    exportHistoryBtn.addEventListener('click', exportConversations);
    importHistoryBtn.addEventListener('click', importConversations);
    
    // 点击主内容区域关闭侧边栏（在移动设备上）
    document.querySelector('.main-content').addEventListener('click', (e) => {
        // 确保不是点击菜单按钮时触发
        if (e.target !== menuToggleBtn && !menuToggleBtn.contains(e.target) && 
            window.innerWidth <= 768 && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });
    
    // 窗口大小变化时处理响应式布局
    window.addEventListener('resize', handleResize);
    
    // 初始化时调整布局
    handleResize();
}

// 处理窗口大小变化
function handleResize() {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('active');
        sidebar.style.transform = '';
    }
}

// 打开设置弹窗
function openSettingsModal() {
    settingsModal.style.display = 'flex';
    apiKeyInput.value = apiKey || '';
    apiProviderSelect.value = apiProvider || 'deepseek';
    systemPromptInput.value = systemPrompt || '';
    userNameInput.value = userName || '我';
    botNameInput.value = botName || 'AI助手';
}

// 关闭设置弹窗
function closeSettingsModal() {
    settingsModal.style.display = 'none';
}

// 保存设置
function saveSettings() {
    apiKey = apiKeyInput.value.trim();
    apiProvider = apiProviderSelect.value;
    systemPrompt = systemPromptInput.value.trim() || '你是一个有用的AI助手，能够回答用户的各种问题。';
    userName = userNameInput.value.trim() || '我';
    botName = botNameInput.value.trim() || 'AI助手';
    
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('apiProvider', apiProvider);
    localStorage.setItem('systemPrompt', systemPrompt);
    localStorage.setItem('userName', userName);
    localStorage.setItem('botName', botName);
    
    // 更新模型选项
    updateModelOptions();
    
    closeSettingsModal();
    
    // 刷新欢迎信息
    if (conversations[currentConversationIndex].messages.length === 0) {
        renderWelcomeMessage();
    }
}

// 加载设置
function loadSettings() {
    apiKey = localStorage.getItem('apiKey') || '';
    apiProvider = localStorage.getItem('apiProvider') || 'deepseek';
    systemPrompt = localStorage.getItem('systemPrompt') || '你是一个有用的AI助手，能够回答用户的各种问题。';
    userName = localStorage.getItem('userName') || '我';
    botName = localStorage.getItem('botName') || 'AI助手';
    selectedModel = localStorage.getItem('selectedModel') || 'deepseek-chat';
    
    // 设置模型选择器的值
    if (modelSelect) {
        modelSelect.value = selectedModel;
    }
    
    // 更新模型选项
    updateModelOptions();
}

// 根据API提供商更新模型选项
function updateModelOptions() {
    // 暂时不实现，可以根据需要添加
}

// 发送消息
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    if (!apiKey) {
        openSettingsModal();
        alert('请先设置API密钥');
        return;
    }
    
    // 添加用户消息到界面
    addMessageToUI('user', message);
    
    // 清空输入框并重置高度
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;
    
    // 添加用户消息到当前对话
    addMessageToConversation('user', message);
    
    // 更新对话标题（使用前几个字作为标题）
    if (conversations[currentConversationIndex].messages.length === 1) {
        const title = message.substring(0, 20) + (message.length > 20 ? '...' : '');
        conversations[currentConversationIndex].title = title;
        renderConversationsList();
    }
    
    // 保存对话到本地存储
    saveConversations();
    
    // 确保滚动到底部查看用户消息
    scrollToBottom(true);
    
    // 对于安卓设备，额外延迟再次滚动
    if (/Android/i.test(navigator.userAgent)) {
        setTimeout(() => scrollToBottom(true), 300);
    }
    
    // 显示加载指示
    const loadingMsgId = 'loading-' + Date.now();
    addLoadingMessageToUI(loadingMsgId);
    
    try {
        // 调用API
        const url = getApiUrl();
        const headers = getApiHeaders();
        const body = getApiRequestBody(message);
        
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body)
        });
        
        // 移除加载消息
        removeLoadingMessage(loadingMsgId);
        
        if (!response.ok) {
            throw new Error(`API错误: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        const botReply = getApiResponseContent(data);
        
        // 添加AI回复到界面
        addMessageToUI('assistant', botReply);
        
        // 添加AI回复到当前对话
        addMessageToConversation('assistant', botReply);
        
        // 确保滚动到底部查看AI回复
        scrollToBottom(true);
        
        // 对于安卓设备，额外延迟再次滚动
        if (/Android/i.test(navigator.userAgent)) {
            setTimeout(() => scrollToBottom(true), 300);
        }
        
        // 更新本地存储
        saveConversations();
        
    } catch (error) {
        // 移除加载消息
        removeLoadingMessage(loadingMsgId);
        
        // 显示错误消息
        addErrorMessageToUI(error.message);
        console.error('API调用错误:', error);
    }
}

// 根据所选API提供商获取API URL
function getApiUrl() {
    // 始终使用默认端点
    return DEFAULT_ENDPOINTS[apiProvider] || DEFAULT_ENDPOINTS['deepseek'];
}

// 获取API请求头
function getApiHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
    };
}

// 根据API提供商构建请求体
function getApiRequestBody(message) {
    const systemMessage = { role: 'system', content: systemPrompt };
    const historyMessages = conversations[currentConversationIndex].messages.filter(m => m.role !== 'system').slice(-historyLimit);
    const messages = [systemMessage, ...historyMessages];
    
    return {
        model: selectedModel,
        messages: messages
    };
}

// 获取上下文消息（例如系统提示）
function getContextMessages() {
    return [
        {"role": "system", "content": systemPrompt}
    ];
}

// 从API响应中提取内容
function getApiResponseContent(data) {
    if (apiProvider === 'openai' || apiProvider === 'deepseek') {
        return data.choices && data.choices[0] && data.choices[0].message 
            ? data.choices[0].message.content 
            : '无法获取回复';
    }
    
    return '不支持的API';
}

// 滚动聊天框到底部 - 增加安卓设备处理
function scrollToBottom(immediate = false) {
    const scrollFunction = () => {
        chatbox.scrollTop = chatbox.scrollHeight;
        
        // 专门针对安卓设备的额外处理
        if (/Android/i.test(navigator.userAgent)) {
            // 尝试强制滚动
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            
            // 使用scrollIntoView作为备用
            const lastMessage = chatbox.lastElementChild;
            if (lastMessage) {
                lastMessage.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
            }
        }
    };
    
    if (immediate) {
        scrollFunction();
    } else {
        setTimeout(scrollFunction, 100);
    }
}

// 添加消息到UI
function addMessageToUI(role, content) {
    // 创建消息组
    const messageGroup = document.createElement('div');
    messageGroup.className = role === 'user' ? 'message-group user-message' : 'message-group bot-message';
    
    // 添加发送者昵称
    const messageSender = document.createElement('div');
    messageSender.className = 'message-sender';
    messageSender.textContent = role === 'user' ? userName : botName;
    messageGroup.appendChild(messageSender);
    
    // 创建消息内容
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // 格式化内容（处理换行符和Markdown）
    const formattedContent = formatMessageContent(content);
    messageContent.innerHTML = formattedContent;
    messageGroup.appendChild(messageContent);
    
    // 创建消息操作区域
    const messageActions = document.createElement('div');
    messageActions.className = 'message-actions';
    
    if (role === 'user') {
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="fas fa-edit"></i> 编辑';
        editBtn.addEventListener('click', () => {
            userInput.value = content;
            userInput.focus();
            // 可以选择从历史中删除此消息及其回复
        });
        messageActions.appendChild(editBtn);
    } else {
        const copyBtn = document.createElement('button');
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> 复制';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(content).then(() => {
                // 可以添加复制成功的提示
                copyBtn.innerHTML = '<i class="fas fa-check"></i> 已复制';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> 复制';
                }, 2000);
            });
        });
        messageActions.appendChild(copyBtn);
    }
    
    messageGroup.appendChild(messageActions);
    
    // 添加到聊天框
    chatbox.appendChild(messageGroup);
    
    // 滚动到底部
    scrollToBottom();
}

// 格式化消息内容
function formatMessageContent(content) {
    // 简单的换行处理，可以扩展为Markdown解析
    return content.replace(/\n/g, '<br>');
}

// 添加加载指示消息
function addLoadingMessageToUI(loadingId) {
    const messageGroup = document.createElement('div');
    messageGroup.className = 'message-group bot-message loading-message';
    messageGroup.id = loadingId;
    
    // 添加发送者昵称
    const messageSender = document.createElement('div');
    messageSender.className = 'message-sender';
    messageSender.textContent = botName;
    messageGroup.appendChild(messageSender);
    
    // 创建消息内容
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
    messageGroup.appendChild(messageContent);
    
    // 添加到聊天框
    chatbox.appendChild(messageGroup);
    
    // 滚动到底部
    scrollToBottom();
}

// 移除加载消息
function removeLoadingMessage(loadingId) {
    const loadingMsg = document.getElementById(loadingId);
    if (loadingMsg) {
        chatbox.removeChild(loadingMsg);
    }
}

// 添加错误消息到UI
function addErrorMessageToUI(errorMessage) {
    const messageGroup = document.createElement('div');
    messageGroup.className = 'message-group bot-message error-message';
    
    // 添加发送者昵称
    const messageSender = document.createElement('div');
    messageSender.className = 'message-sender';
    messageSender.textContent = '系统';
    messageGroup.appendChild(messageSender);
    
    // 创建消息内容
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = `<strong>错误:</strong> ${errorMessage}`;
    messageGroup.appendChild(messageContent);
    
    // 添加到聊天框
    chatbox.appendChild(messageGroup);
    
    // 滚动到底部
    scrollToBottom();
}

// 添加消息到当前对话
function addMessageToConversation(role, content) {
    conversations[currentConversationIndex].messages.push({
        role: role,
        content: content
    });
}

// 创建新对话
function createNewConversation() {
    const newConversation = {
        id: Date.now(),
        title: '新对话',
        messages: []
    };
    
    conversations.unshift(newConversation);
    currentConversationIndex = 0;
    
    clearChatUI();
    renderWelcomeMessage();
}

// 渲染欢迎信息
function renderWelcomeMessage() {
    chatbox.innerHTML = '';
    
    if (apiKey) {
        // 已设置API密钥，显示简洁欢迎信息
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerHTML = `
            <h2>欢迎使用AI对话助手</h2>
            <button id="openSettingsBtn2">设置</button>
        `;
        chatbox.appendChild(welcomeDiv);
        
        // 添加事件监听
        document.getElementById('openSettingsBtn2').addEventListener('click', openSettingsModal);
    } else {
        // 未设置API密钥，显示提示
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerHTML = `
            <h2>欢迎使用AI对话助手</h2>
            <button id="openSettingsBtn2">设置API密钥</button>
        `;
        chatbox.appendChild(welcomeDiv);
        
        // 添加事件监听
        document.getElementById('openSettingsBtn2').addEventListener('click', openSettingsModal);
    }
}

// 清空聊天UI
function clearChatUI() {
    chatbox.innerHTML = '';
}

// 显示当前对话
function displayCurrentConversation() {
    clearChatUI();
    
    if (conversations[currentConversationIndex].messages.length === 0) {
        renderWelcomeMessage();
        return;
    }
    
    // 显示所有消息
    conversations[currentConversationIndex].messages.forEach(msg => {
        addMessageToUI(msg.role, msg.content);
    });
}

// 渲染对话列表
function renderConversationsList() {
    historyList.innerHTML = '';
    
    conversations.forEach((conversation, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'chat-history-item' + (index === currentConversationIndex ? ' active' : '');
        
        // 创建对话标题和删除按钮的容器
        const itemContent = document.createElement('div');
        itemContent.className = 'history-item-content';
        
        // 添加对话图标和标题
        itemContent.innerHTML = `
            <div class="history-item-title">
                <i class="fas fa-comment"></i>
                <span>${conversation.title}</span>
            </div>
        `;
        
        // 创建删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-history-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = '删除此对话';
        
        // 添加删除按钮的点击事件
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡到historyItem
            deleteConversation(index);
        });
        
        // 将删除按钮添加到itemContent
        itemContent.appendChild(deleteBtn);
        
        // 将itemContent添加到historyItem
        historyItem.appendChild(itemContent);
        
        // 切换对话
        historyItem.addEventListener('click', () => {
            currentConversationIndex = index;
            displayCurrentConversation();
            renderConversationsList();
            
            // 在移动设备上选择对话后关闭侧边栏
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
            }
        });
        
        historyList.appendChild(historyItem);
    });
}

// 删除对话
function deleteConversation(index) {
    // 显示确认对话框
    if (confirm('确定要删除这个对话吗？此操作不可撤销。')) {
        // 从数组中删除对话
        conversations.splice(index, 1);
        
        // 如果删除的是当前对话或者没有对话了
        if (conversations.length === 0) {
            // 创建新对话
            createNewConversation();
        } else if (index <= currentConversationIndex) {
            // 如果删除的是当前对话或者之前的对话，调整当前对话索引
            currentConversationIndex = Math.max(0, index === 0 ? 0 : currentConversationIndex - 1);
        }
        
        // 保存到本地存储
        saveConversations();
        
        // 显示当前对话
        displayCurrentConversation();
        
        // 重新渲染对话列表
        renderConversationsList();
    }
}

// 加载对话历史
function loadConversations() {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
        try {
            conversations = JSON.parse(savedConversations);
        } catch (error) {
            console.error('加载对话失败:', error);
            conversations = [];
        }
    }
}

// 保存对话历史
function saveConversations() {
    localStorage.setItem('conversations', JSON.stringify(conversations));
}

// 导出所有对话
function exportConversations() {
    if (conversations.length === 0) {
        alert('没有对话可导出');
        return;
    }
    
    try {
        const exportData = JSON.stringify(conversations, null, 2);
        const blob = new Blob([exportData], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `ai-chat-history-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        
        // 添加下载完成提示
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert(`成功导出 ${conversations.length} 条对话记录`);
        }, 100);
    } catch (error) {
        alert('导出失败: ' + error.message);
        console.error('导出错误:', error);
    }
}

// 导入对话
function importConversations() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (Array.isArray(importedData) && importedData.length > 0) {
                    // 检查是否有有效的对话结构
                    const validImport = importedData.every(conv => 
                        typeof conv === 'object' && 
                        conv.id && 
                        conv.title && 
                        Array.isArray(conv.messages)
                    );
                    
                    if (validImport) {
                        if (confirm('确定要导入这些对话吗？这将合并到您当前的对话中。')) {
                            // 合并导入的对话
                            conversations = [...importedData, ...conversations];
                            saveConversations();
                            
                            // 重新加载界面
                            currentConversationIndex = 0;
                            displayCurrentConversation();
                            renderConversationsList();
                            
                            alert(`成功导入了 ${importedData.length} 个对话。`);
                        }
                    } else {
                        alert('无效的对话文件格式');
                    }
                } else {
                    alert('导入的文件不包含有效的对话数据');
                }
            } catch (error) {
                alert('无法解析导入的文件: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// 自定义CSS添加
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .loading-dots {
            display: flex;
            gap: 4px;
            align-items: center;
            justify-content: center;
        }
        
        .loading-dots span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: var(--text-light);
            animation: dot-flashing 1s infinite alternate;
        }
        
        .loading-dots span:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .loading-dots span:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes dot-flashing {
            0% {
                opacity: 0.2;
            }
            100% {
                opacity: 1;
            }
        }
        
        .error-avatar {
            background-color: #f44336;
            color: white;
        }
    `;
    document.head.appendChild(style);
}

// 添加自定义样式
addCustomStyles();