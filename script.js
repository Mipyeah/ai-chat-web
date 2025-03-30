// 全局变量
let conversations = []; // 存储多个对话
let currentConversationIndex = -1;
let settingsModal;
let apiKey = '';
let apiProvider = 'deepseek';
let systemPrompt = '你是一个有用的AI助手，能够回答用户的各种问题。';
let selectedModel = 'deepseek-chat';

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
    
    // 事件监听器
    setupEventListeners();
});

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
    
    // 移动设备菜单切换
    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    
    // 点击主内容区域关闭侧边栏（在移动设备上）
    document.querySelector('.main-content').addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
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
    
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('apiProvider', apiProvider);
    localStorage.setItem('systemPrompt', systemPrompt);
    
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
    const messages = [
        ...getContextMessages(),
        ...conversations[currentConversationIndex].messages
    ];
    
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

// 添加消息到UI
function addMessageToUI(role, content) {
    // 创建消息组
    const messageGroup = document.createElement('div');
    messageGroup.className = role === 'user' ? 'message-group user-message' : 'message-group bot-message';
    
    // 创建消息头部（头像和名称）
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    // 创建头像
    const avatar = document.createElement('div');
    avatar.className = role === 'user' ? 'avatar user-avatar' : 'avatar bot-avatar';
    avatar.textContent = role === 'user' ? '你' : 'AI';
    
    // 将头像添加到头部
    messageHeader.appendChild(avatar);
    
    // 创建消息内容
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // 格式化内容（处理换行符和Markdown）
    const formattedContent = formatMessageContent(content);
    messageContent.innerHTML = formattedContent;
    
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
    
    // 将所有元素添加到消息组
    messageGroup.appendChild(messageHeader);
    messageGroup.appendChild(messageContent);
    messageGroup.appendChild(messageActions);
    
    // 添加到聊天框
    chatbox.appendChild(messageGroup);
    
    // 滚动到底部
    chatbox.scrollTop = chatbox.scrollHeight;
}

// 格式化消息内容
function formatMessageContent(content) {
    // 简单的换行处理，可以扩展为Markdown解析
    return content.replace(/\n/g, '<br>');
}

// 添加加载指示消息
function addLoadingMessageToUI(loadingId) {
    const messageGroup = document.createElement('div');
    messageGroup.className = 'message-group bot-message';
    messageGroup.id = loadingId;
    
    // 创建消息头部
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    // 创建头像
    const avatar = document.createElement('div');
    avatar.className = 'avatar bot-avatar';
    avatar.textContent = 'AI';
    
    // 将头像添加到头部
    messageHeader.appendChild(avatar);
    
    // 创建消息内容
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
    
    // 将所有元素添加到消息组
    messageGroup.appendChild(messageHeader);
    messageGroup.appendChild(messageContent);
    
    // 添加到聊天框
    chatbox.appendChild(messageGroup);
    
    // 滚动到底部
    chatbox.scrollTop = chatbox.scrollHeight;
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
    messageGroup.className = 'message-group error-message';
    
    // 创建消息头部
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    // 创建头像
    const avatar = document.createElement('div');
    avatar.className = 'avatar error-avatar';
    avatar.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    
    // 将头像添加到头部
    messageHeader.appendChild(avatar);
    
    // 创建消息内容
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = `<strong>错误:</strong> ${errorMessage}`;
    
    // 将所有元素添加到消息组
    messageGroup.appendChild(messageHeader);
    messageGroup.appendChild(messageContent);
    
    // 添加到聊天框
    chatbox.appendChild(messageGroup);
    
    // 滚动到底部
    chatbox.scrollTop = chatbox.scrollHeight;
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
        historyItem.innerHTML = `
            <i class="fas fa-comment"></i>
            <span>${conversation.title}</span>
        `;
        
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
    
    const exportData = JSON.stringify(conversations, null, 2);
    const blob = new Blob([exportData], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `ai-chat-history-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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