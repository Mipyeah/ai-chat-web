// 全局变量
let conversations = []; // 存储多个对话
let currentConversationIndex = -1;
let settingsModal;
let apiKey = '';
let apiProvider = 'deepseek';
let systemPrompt = '你是一个有用的AI助手，能够回答用户的各种问题。';


let userName = '我'; // 用户昵称
let enableLogging = false; // 是否启用输出日志
// 自动压缩与历史保留设置
let autoCompressEnabled = false;
let autoCompressThreshold = 50; // 触发压缩的非系统消息条数
let historyLimit = 10; // 保留最近N轮非系统消息用于上下文

// AI角色管理
let aiRoles = [
    {
        id: 1,
        name: 'AI助手',
        prompt: '你是一个有用的AI助手，能够回答用户的各种问题。',
        order: 1,
        enabled: true
        // 移除全局的conversationHistory，改为按对话存储
    }
];
let currentRoleIndex = 0; // 当前使用的角色索引

// 默认API端点
const DEFAULT_ENDPOINTS = {
    'deepseek': 'https://api.deepseek.com/v1/chat/completions',
    'openai': 'https://api.openai.com/v1/chat/completions'
};

// DOM元素引用
const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const modeIndicator = document.getElementById('modeIndicator');
const modeText = document.getElementById('modeText');
const settingsBtn = document.getElementById('settingsBtn');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const closeModalBtn = document.querySelector('.close-modal');
const apiKeyInput = document.getElementById('apiKey');
const apiProviderSelect = document.getElementById('apiProvider');
const systemPromptInput = document.getElementById('systemPrompt');
const userNameInput = document.getElementById('userName');
const enableLoggingInput = document.getElementById('enableLogging');
const logManagementSection = document.getElementById('logManagementSection');
// 自动压缩相关DOM
const autoCompressEnabledInput = document.getElementById('autoCompressEnabled');
const autoCompressThresholdInput = document.getElementById('autoCompressThreshold');
const historyLimitInput = document.getElementById('historyLimit');
const exportLogsBtn = document.getElementById('exportLogsBtn');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const logInfo = document.getElementById('logInfo');
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

    // 自动压缩联动：开关控制阈值输入禁用状态；保留轮数作为阈值的最小值
    const syncThresholdMin = () => {
        if (!historyLimitInput || !autoCompressThresholdInput) return;
        const minVal = parseInt(historyLimitInput.value || String(historyLimit || 10), 10) || 10;
        autoCompressThresholdInput.min = String(minVal);
        const curVal = parseInt(autoCompressThresholdInput.value || '0', 10) || 0;
        if (curVal < minVal) {
            autoCompressThresholdInput.value = String(minVal);
        }
    };
    if (autoCompressEnabledInput && autoCompressThresholdInput) {
        const updateThresholdState = () => {
            autoCompressThresholdInput.disabled = !autoCompressEnabledInput.checked;
        };
        autoCompressEnabledInput.addEventListener('change', updateThresholdState);
        updateThresholdState();
    }
    if (historyLimitInput) {
        historyLimitInput.addEventListener('input', syncThresholdMin);
        syncThresholdMin();
    }
    if (autoCompressThresholdInput) {
        autoCompressThresholdInput.addEventListener('input', syncThresholdMin);
    }
    
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
    
    // 取消设置按钮事件
    document.getElementById('cancelSettingsBtn').addEventListener('click', closeSettingsModal);
    
    // 角色管理事件
    const addRoleBtn = document.getElementById('addRoleBtn');
    if (addRoleBtn) {
        addRoleBtn.addEventListener('click', addRole);
    }
    
    // API提供商变化时更新模式指示器
    apiProviderSelect.addEventListener('change', updateModeIndicator);
    // 移除点击背景关闭弹窗的逻辑
    // window.addEventListener('click', (e) => {
    //     if (e.target === settingsModal) {
    //         closeSettingsModal();
    //     }
    // });
    
    // 自动调整文本框高度
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight < 200) ? `${userInput.scrollHeight}px` : '200px';
        
        // 启用/禁用发送按钮
        sendBtn.disabled = userInput.value.trim() === '';
        
        // 确保输入框高度变化后，聊天内容也相应滚动
        chatbox.scrollTop = chatbox.scrollHeight;
    });
    
    // 更新模式指示器
    updateModeIndicator();
    
    // 设置日志相关的事件监听器
    setupLogEventListeners();
    
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
    enableLoggingInput.checked = enableLogging;
    if (historyLimitInput) historyLimitInput.value = String(historyLimit || 10);
    if (autoCompressEnabledInput) autoCompressEnabledInput.checked = !!autoCompressEnabled;
    if (autoCompressThresholdInput) autoCompressThresholdInput.value = String(autoCompressThreshold || 50);
    if (autoCompressThresholdInput) {
        autoCompressThresholdInput.disabled = !(autoCompressEnabledInput && autoCompressEnabledInput.checked);
        autoCompressThresholdInput.min = String(historyLimit || 10);
    }
    
    // 更新日志管理区域的显示状态
    updateLogManagementSection();
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
    enableLogging = enableLoggingInput.checked;

    // 读取并规范历史保留与自动压缩设置
    const historyVal = parseInt((historyLimitInput && historyLimitInput.value) || '10', 10);
    historyLimit = isNaN(historyVal) ? 10 : Math.min(Math.max(historyVal, 1), 50);
    autoCompressEnabled = !!(autoCompressEnabledInput && autoCompressEnabledInput.checked);
    const thresholdVal = parseInt((autoCompressThresholdInput && autoCompressThresholdInput.value) || '50', 10);
    autoCompressThreshold = Math.max(
        historyLimit,
        isNaN(thresholdVal) ? 50 : Math.min(Math.max(thresholdVal, 10), 200)
    );
    
    // 保存发言模式
    const speakMode = document.getElementById('speakMode').value;
    
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('apiProvider', apiProvider);
    localStorage.setItem('systemPrompt', systemPrompt);
    localStorage.setItem('userName', userName);
    localStorage.setItem('enableLogging', enableLogging);
    localStorage.setItem('speakMode', speakMode);
    localStorage.setItem('historyLimit', String(historyLimit));
    localStorage.setItem('autoCompressEnabled', String(autoCompressEnabled));
    localStorage.setItem('autoCompressThreshold', String(autoCompressThreshold));
    
    // 保存AI角色配置
    saveAIRoles();
    
    // 更新模式指示器
    updateModeIndicator();
    
    closeSettingsModal();
    
    // 刷新欢迎信息
    if (conversations[currentConversationIndex].messages.length === 0) {
        renderWelcomeMessage();
    }
    
    // 更新日志管理区域
    updateLogManagementSection();
}

// 保存AI角色配置（不关闭弹窗）
function saveAIRoles() {
    localStorage.setItem('aiRoles', JSON.stringify(aiRoles));
}

// 加载设置
function loadSettings() {
    apiKey = localStorage.getItem('apiKey') || '';
    apiProvider = localStorage.getItem('apiProvider') || 'deepseek';
    systemPrompt = localStorage.getItem('systemPrompt') || '你是一个有用的AI助手，能够回答用户的各种问题。';
    userName = localStorage.getItem('userName') || '我';
    enableLogging = localStorage.getItem('enableLogging') === 'true';
    // 加载历史保留与自动压缩设置
    historyLimit = parseInt(localStorage.getItem('historyLimit') || '10', 10);
    if (isNaN(historyLimit)) historyLimit = 10;
    autoCompressEnabled = localStorage.getItem('autoCompressEnabled') === 'true';
    autoCompressThreshold = parseInt(localStorage.getItem('autoCompressThreshold') || '50', 10);
    if (isNaN(autoCompressThreshold)) autoCompressThreshold = 50;
    
    // 加载发言模式
    const speakMode = localStorage.getItem('speakMode') || 'sequential';

    // 加载AI角色配置
    const savedRoles = localStorage.getItem('aiRoles');
    if (savedRoles) {
        aiRoles = JSON.parse(savedRoles);
        
        // 为现有角色初始化独立历史记录（向后兼容）
        aiRoles.forEach(role => {
            if (!role.conversationHistory) {
                role.conversationHistory = [];
            }
            // 为现有角色初始化enabled属性（向后兼容）
            if (role.enabled === undefined) {
                role.enabled = true;
            }
        });
    }
    
    // 更新模式指示器
    updateModeIndicator();
    
    // 渲染角色列表
    renderRolesList();
    
    // 恢复发言模式设置
    const speakModeSelect = document.getElementById('speakMode');
    if (speakModeSelect) {
        speakModeSelect.value = speakMode;
    }
}

// 更新模式指示器
function updateModeIndicator() {
    if (modeText) {
        const enabledCount = aiRoles.filter(role => role.enabled !== false).length;
        if (enabledCount > 0) {
            modeText.textContent = `启用AI：${enabledCount}个`;
        } else {
            modeText.textContent = '无启用AI';
        }
        if (modeIndicator) {
            modeIndicator.classList.remove('multi-ai');
        }
    }
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
    
    // 清空输入框并重置高度
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;
    
    // 添加用户消息到界面和对话
    addMessageToUI('user', message);
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
        // 移除加载消息
        removeLoadingMessage(loadingMsgId);
        
        // 根据AI角色数量决定使用单AI还是多AI模式
        if (aiRoles.length === 1) {
            // 单AI模式
            const url = getApiUrl();
            const headers = getApiHeaders();
            const body = getApiRequestBody(message);
            
            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                throw new Error(`API错误: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            const botReply = getApiResponseContent(data);
            
            // 清理AI回复中的重复昵称（如果有当前角色）
            const currentRole = aiRoles[currentRoleIndex];
            const cleanedReply = currentRole ? cleanDuplicateNickname(botReply, currentRole.name) : botReply;
            
            // 记录日志（如果启用）
            if (enableLogging) {
                logApiRequest('单AI模式', body, data);
            }
            
            // 添加AI回复到界面
            addMessageToUI('assistant', cleanedReply);
            
            // 添加AI回复到当前对话
            addMessageToConversation('assistant', cleanedReply, currentRole ? currentRole.name : null);
            
        } else {
            // 多AI模式
            await processMultiAIConversation(message);
        }
        
        // 确保滚动到底部查看AI回复
        scrollToBottom(true);
        
        // 对于安卓设备，额外延迟再次滚动
        if (/Android/i.test(navigator.userAgent)) {
            setTimeout(() => scrollToBottom(true), 300);
        }
        
        // 更新本地存储
        saveConversations();
        // 触发自动压缩（如启用且满足条件）
        await autoCompressCurrentConversationIfNeeded();
        
    } catch (error) {
        // 移除加载消息
        removeLoadingMessage(loadingMsgId);
        
        // 记录错误日志（如果启用）
        if (enableLogging && aiRoles.length === 1) {
            const body = getApiRequestBody(message);
            logApiError('单AI模式', body, error);
        }
        
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
    const currentRole = aiRoles[currentRoleIndex] || { prompt: '' };
    const combinedPrompt = `${systemPrompt}\n\n角色设定：${currentRole.prompt}`.trim();
    const systemMessage = { role: 'system', content: combinedPrompt };

    const historyMessages = conversations[currentConversationIndex].messages.filter(m => m.role !== 'system').slice(-historyLimit);
    const messages = [systemMessage, ...historyMessages];
    
    // 根据API提供商设置合适的模型
    let model = 'deepseek-chat';
    if (apiProvider === 'openai') {
        model = 'gpt-3.5-turbo';
    } else if (apiProvider === 'deepseek') {
        model = 'deepseek-chat';
    }
    
    return {
        model: model,
        messages: messages
    };
}

// 为多AI模式构建请求体
function getApiRequestBodyForRole(rolePrompt, messages) {
    const combinedPrompt = `${systemPrompt}\n\n角色设定：${rolePrompt}`.trim();
    const systemMessage = { role: 'system', content: combinedPrompt };
    
    // 处理消息，为包含aiName的消息添加角色标识
    const processedMessages = messages.map(msg => {
        if (msg.aiName) {
            // 为AI消息添加角色标识，让AI知道这是哪个角色的回复
            return {
                role: msg.role,
                content: `[${msg.aiName}]: ${msg.content}`
            };
        }
        return msg;
    });
    
    // 根据API提供商设置合适的模型
    let model = 'deepseek-chat';
    if (apiProvider === 'openai') {
        model = 'gpt-3.5-turbo';
    } else if (apiProvider === 'deepseek') {
        model = 'deepseek-chat';
    }
    
    return {
        model: model,
        messages: [systemMessage, ...processedMessages]
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
function addMessageToUI(role, content, aiName = null) {
    // 如果是第一条消息，隐藏欢迎界面
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    // 创建消息组
    const messageGroup = document.createElement('div');
    messageGroup.className = role === 'user' ? 'message-group user-message' : 'message-group bot-message';
    
    // 添加发送者昵称
    const messageSender = document.createElement('div');
    messageSender.className = 'message-sender';
    
    // 如果是AI回复且有昵称，使用AI昵称；否则使用默认昵称
    if (role === 'assistant' && aiName) {
        messageSender.textContent = aiName;
    } else if (role === 'user') {
        messageSender.textContent = userName;
    } else {
        messageSender.textContent = aiRoles[currentRoleIndex].name;
    }
    
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
    messageSender.textContent = aiRoles[currentRoleIndex].name;
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

// 清理AI回复中的重复昵称
function cleanDuplicateNickname(content, aiName) {
    if (!aiName || !content) return content;
    
    // 移除开头的重复昵称格式，如 "[小师妹]: [小师妹]: 内容" -> "内容"
    const nicknamePattern = new RegExp(`^\\[${escapeRegExp(aiName)}\\]:\\s*\\[${escapeRegExp(aiName)}\\]:\\s*`, 'i');
    if (nicknamePattern.test(content)) {
        return content.replace(nicknamePattern, '');
    }
    
    // 移除开头的单个昵称格式，如 "[小师妹]: 内容" -> "内容"
    const singleNicknamePattern = new RegExp(`^\\[${escapeRegExp(aiName)}\\]:\\s*`, 'i');
    if (singleNicknamePattern.test(content)) {
        return content.replace(singleNicknamePattern, '');
    }
    
    return content;
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 添加消息到当前对话
function addMessageToConversation(role, content, aiName = null) {
    // 如果是AI回复，清理重复昵称
    let cleanedContent = content;
    if (role === 'assistant' && aiName) {
        cleanedContent = cleanDuplicateNickname(content, aiName);
    }
    
    const messageData = {
        role: role,
        content: cleanedContent
    };
    
    // 如果是AI回复，添加AI昵称
    if (role === 'assistant' && aiName) {
        messageData.aiName = aiName;
    }
    
    conversations[currentConversationIndex].messages.push(messageData);
    
    // 应用历史消息限制
    const nonSystemMessages = conversations[currentConversationIndex].messages.filter(m => m.role !== 'system');
    if(nonSystemMessages.length > historyLimit * 2) {
        const messagesToKeep = nonSystemMessages.slice(-historyLimit);
        conversations[currentConversationIndex].messages = [
            ...conversations[currentConversationIndex].messages.filter(m => m.role === 'system'),
            ...messagesToKeep
        ];
    }
}

// 创建新对话
function createNewConversation() {
    const newConversation = {
        id: Date.now(),
        title: '新对话',
        messages: [],
        roleHistories: {} // 初始化AI角色的独立历史记录存储
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
    
    // 优先显示压缩摘要（如存在），其余消息按原顺序显示
    const msgs = conversations[currentConversationIndex].messages;
    const summaryIndex = msgs.findIndex(m => m.role === 'assistant' && typeof m.content === 'string' && m.content.startsWith('【对话摘要】'));
    if (summaryIndex !== -1) {
        const summaryMsg = msgs[summaryIndex];
        addMessageToUI(summaryMsg.role, summaryMsg.content, summaryMsg.aiName);
        msgs.forEach((msg, idx) => {
            if (idx !== summaryIndex) {
                addMessageToUI(msg.role, msg.content, msg.aiName);
            }
        });
    } else {
        // 显示所有消息
        msgs.forEach(msg => {
            addMessageToUI(msg.role, msg.content, msg.aiName);
        });
    }
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
            
            // 确保所有对话都有roleHistories字段（向后兼容）
            conversations.forEach(conversation => {
                if (!conversation.roleHistories) {
                    conversation.roleHistories = {};
                }
            });
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

// 导出当前选中对话
function exportConversations() {
    if (conversations.length === 0) {
        alert('没有对话可导出');
        return;
    }

    const index = (currentConversationIndex >= 0 && currentConversationIndex < conversations.length)
        ? currentConversationIndex
        : 0;
    const conv = conversations[index];
    
    try {
        if (!conv.roleHistories) conv.roleHistories = {};
        const exportData = JSON.stringify(conv, null, 2);
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeTitle = (conv.title || '对话').replace(/[\\/:*?"<>|]/g, '').slice(0, 50);
        a.href = url;
        a.download = `ai-chat-${safeTitle || conv.id}-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert(`成功导出当前对话：${conv.title || conv.id}`);
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

                const isArray = Array.isArray(importedData);
                const isSingle = !isArray && typeof importedData === 'object' && importedData !== null;

                const validateConv = (conv) => (
                    typeof conv === 'object' &&
                    conv.id &&
                    conv.title &&
                    Array.isArray(conv.messages)
                );

                if (isArray && importedData.length > 0) {
                    const validImport = importedData.every(validateConv);
                    if (validImport) {
                        if (confirm('确定要导入这些对话吗？这将合并到您当前的对话中。')) {
                            conversations = [...importedData, ...conversations];
                            // 兼容缺失的roleHistories
                            conversations.forEach(c => { if (!c.roleHistories) c.roleHistories = {}; });
                            saveConversations();
                            currentConversationIndex = 0;
                            displayCurrentConversation();
                            renderConversationsList();
                            alert(`成功导入了 ${importedData.length} 个对话。`);
                        }
                    } else {
                        alert('无效的对话文件格式');
                    }
                } else if (isSingle && validateConv(importedData)) {
                    if (confirm('确定要导入此对话吗？这将添加到您当前的对话中。')) {
                        if (!importedData.roleHistories) importedData.roleHistories = {};
                        conversations = [importedData, ...conversations];
                        saveConversations();
                        currentConversationIndex = 0;
                        displayCurrentConversation();
                        renderConversationsList();
                        alert('成功导入了 1 个对话。');
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

// 角色管理函数
function renderRolesList() {
    const rolesContainer = document.getElementById('rolesContainer');
    if (!rolesContainer) return;
    
    // 控制多AI设置区域的显示
    const multiAISettings = document.getElementById('multiAISettings');
    if (multiAISettings) {
        if (aiRoles.length > 1) {
            multiAISettings.style.display = 'block';
        } else {
            multiAISettings.style.display = 'none';
        }
    }
    
    rolesContainer.innerHTML = '';
    
    aiRoles.forEach((role, index) => {
        const roleDiv = document.createElement('div');
        roleDiv.className = 'role-item';
        roleDiv.innerHTML = `
            <div class="role-header">
                <span class="role-order">角色${role.order}</span>
                <input type="text" class="role-name" value="${role.name}" placeholder="角色昵称" 
                       data-index="${index}">
                <button class="toggle-role-btn" data-index="${index}" title="${role.enabled !== false ? '禁用角色' : '启用角色'}">
                    <i class="fas ${role.enabled !== false ? 'fa-eye' : 'fa-eye-slash'}"></i>
                </button>
                <button class="delete-role-btn" data-index="${index}" title="删除角色">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <textarea class="role-prompt" placeholder="角色提示词" rows="2"
                      data-index="${index}">${role.prompt}</textarea>
        `;
        
        // 绑定事件处理器
        const nameInput = roleDiv.querySelector('.role-name');
        const promptTextarea = roleDiv.querySelector('.role-prompt');
        const toggleBtn = roleDiv.querySelector('.toggle-role-btn');
        const deleteBtn = roleDiv.querySelector('.delete-role-btn');
        
        nameInput.addEventListener('change', function() {
            updateRoleName(index, this.value);
        });
        
        promptTextarea.addEventListener('change', function() {
            updateRolePrompt(index, this.value);
        });

        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleRoleEnabled(index);
        });

        deleteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            deleteRole(index);
        });
        
        rolesContainer.appendChild(roleDiv);
    });
}

function addRole() {
    const newRole = {
        id: Date.now(),
        name: `角色${aiRoles.length + 1}`,
        prompt: '你是一个有用的AI助手，能够回答用户的各种问题。',
        order: aiRoles.length + 1,
        enabled: true
        // 移除全局的conversationHistory
    };
    
    aiRoles.push(newRole);
    renderRolesList();
    saveAIRoles();
}

function updateRoleName(index, name) {
    if (index >= 0 && index < aiRoles.length) {
        aiRoles[index].name = name.trim() || `角色${index + 1}`;
        saveAIRoles();
    }
}

function updateRolePrompt(index, prompt) {
    if (index >= 0 && index < aiRoles.length) {
        aiRoles[index].prompt = prompt.trim() || '你是一个有用的AI助手，能够回答用户的各种问题。';
        saveAIRoles();
    }
}

function toggleRoleEnabled(index) {
    if (index >= 0 && index < aiRoles.length) {
        // 检查是否至少有一个角色保持启用状态
        const enabledRoles = aiRoles.filter(role => role.enabled !== false);
        
        if (enabledRoles.length === 1 && aiRoles[index].enabled !== false) {
            alert('至少需要保留一个启用的AI角色');
            return;
        }
        
        // 切换启用状态
        aiRoles[index].enabled = aiRoles[index].enabled === false ? true : false;
        
        renderRolesList();
        saveAIRoles();
        updateModeIndicator();
    }
}

function deleteRole(index) {
    if (aiRoles.length <= 1) {
        alert('至少需要保留一个AI角色');
        return;
    }
    
    if (confirm(`确定要删除角色"${aiRoles[index].name}"吗？`)) {
        aiRoles.splice(index, 1);
        
        // 重新排序
        aiRoles.forEach((role, idx) => {
            role.order = idx + 1;
        });
        
        renderRolesList();
        saveAIRoles();
    }
}

// 多AI对话处理函数
async function processMultiAIConversation(userMessage) {
    const conversationHistory = conversations[currentConversationIndex].messages;
    
    // 获取当前发言模式
    const speakMode = document.getElementById('speakMode').value;
    
    if (speakMode === 'sequential') {
        // 依次发言模式
        await processSequentialMode(userMessage);
    } else {
        // 同时发言模式
        await processSimultaneousMode(userMessage);
    }
}

// 依次发言模式：AI轮流回复，每个AI都能看到之前所有AI的回复
async function processSequentialMode(userMessage) {
    const conversationHistory = conversations[currentConversationIndex].messages;
    const aiReplies = [];
    
    // 过滤出启用的角色
    const enabledRoles = aiRoles.filter(role => role.enabled !== false);
    
    if (enabledRoles.length === 0) {
        addErrorMessageToUI('没有启用的AI角色可以回复');
        return;
    }
    
    // 为每个启用的角色依次构建上下文并获取回复
    // 将 userInputContent 提升到函数作用域，便于循环结束后使用
    let userInputContent = '';
    
    for (let i = 0; i < enabledRoles.length; i++) {
        const currentRole = enabledRoles[i];
        
        // 获取该AI角色在当前对话中的独立历史记录
        const roleSpecificMessages = getRoleConversationHistory(currentRole.id, conversations[currentConversationIndex].id);
        
        // 构建该角色的专属上下文：
        // 1. 使用该AI在当前对话中的独立历史记录
        // 2. 添加当前用户输入（包含之前AI的回复）
        const contextMessages = [...roleSpecificMessages];
        
        // 构建用户输入内容，包含之前AI的回复
        userInputContent = `[${userName}]：${userMessage}`;
        
        // 如果有之前AI的回复，将它们添加到用户输入中
        if (aiReplies.length > 0) {
            const previousReplies = aiReplies.map(reply => `[${reply.name}]：${reply.content}`);
            userInputContent += `\n${previousReplies.join('\n')}`;
        }
        
        // 对于角色1，需要检查是否有上一轮其他AI的回复
        if (i === 0) {
            const previousRoundReplies = getPreviousRoundReplies();
            if (previousRoundReplies.length > 0) {
                userInputContent += `\n${previousRoundReplies.join('\n')}`;
            }
        }
        
        // 添加当前用户消息（包含之前AI的回复）
        contextMessages.push({ role: 'user', content: userInputContent });
        
        // 在 try/catch 外声明 requestBody，避免在 catch 中引用未定义
        let requestBody = null;
        try {
            // 调用API获取AI回复
            const url = getApiUrl();
            const headers = getApiHeaders();
            requestBody = getApiRequestBodyForRole(currentRole.prompt, contextMessages);
            
            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`API错误: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            const aiReply = data.choices[0].message.content;
            
            // 清理AI回复中的重复昵称
            const cleanedReply = cleanDuplicateNickname(aiReply, currentRole.name);
            
            // 收集AI回复
            aiReplies.push({
                name: currentRole.name,
                content: cleanedReply
            });
            
            // 更新该AI角色在当前对话中的独立历史记录
            const updatedHistory = [
                ...roleSpecificMessages,
                { role: 'user', content: userInputContent },
                { role: 'assistant', content: cleanedReply, aiName: currentRole.name }
            ];
            updateRoleConversationHistory(currentRole.id, conversations[currentConversationIndex].id, updatedHistory);
            
            // 记录日志
            if (enableLogging) {
                logApiRequest(currentRole.name, requestBody, data);
            }
            
        } catch (error) {
            console.error('AI回复错误:', error);
            const errorMsg = `角色"${currentRole.name}"回复失败: ${error.message}`;
            addErrorMessageToUI(errorMsg);
            
            if (enableLogging) {
                logApiError(currentRole.name, requestBody, error);
            }
            
            break;
        }
    }
    
    // 注意：不需要回填其他AI回复，因为userInputContent已经包含了其他AI的回复
    // 这样可以避免重复添加相同的信息到角色历史记录中
    
    // 添加消息到对话
    if (aiReplies.length > 0) {
        // 不再回填包含其他AI回复的用户消息到对话，避免重复显示
        // 仅添加AI回复到对话与界面
        aiReplies.forEach((reply) => {
            addMessageToConversation('assistant', reply.content, reply.name);
            addMessageToUI('assistant', reply.content, reply.name);
        });
        
        // 更新对话标题
        if (conversations[currentConversationIndex].messages.length === 1) {
            const title = userMessage.substring(0, 20) + (userMessage.length > 20 ? '...' : '');
            conversations[currentConversationIndex].title = title;
            renderConversationsList();
        }
        
        saveConversations();
        
        // 滚动到底部
        setTimeout(() => {
            chatbox.scrollTop = chatbox.scrollHeight;
        }, 100);
    }
}

// 同时发言模式：所有AI同时处理相同的输入
async function processSimultaneousMode(userMessage) {
    const conversationHistory = conversations[currentConversationIndex].messages;
    
    // 过滤出启用的角色
    const enabledRoles = aiRoles.filter(role => role.enabled !== false);
    
    if (enabledRoles.length === 0) {
        addErrorMessageToUI('没有启用的AI角色可以回复');
        return;
    }
    
    // 构建用户输入内容，包含其他AI的回复
    let userInputContent = `[${userName}]：${userMessage}`;
    
    // 检查是否有其他AI的回复需要包含
    if (conversationHistory.length > 0) {
        const otherAIReplies = [];
        
        // 获取当前对话中其他AI的回复
        const hasPreviousAIReplies = conversationHistory.some(msg =>
            msg.role === 'assistant' && msg.aiName
        );
        
        if (hasPreviousAIReplies) {
            // 获取当前对话中所有启用AI角色的消息
            for (const currentRole of enabledRoles) {
                const roleMessages = conversationHistory.filter(msg =>
                    msg.role === 'assistant' && msg.aiName === currentRole.name
                );
                
                if (roleMessages.length > 0) {
                    const lastReply = roleMessages[roleMessages.length - 1];
                    otherAIReplies.push(`[${currentRole.name}]：${lastReply.content}`);
                }
            }
        }
        
        if (otherAIReplies.length > 0) {
            userInputContent += `，${otherAIReplies.join('，')}`;
        }
    }
    
    // 所有启用的AI同时处理相同的输入
    const promises = enabledRoles.map(async (currentRole) => {
        // 获取该AI角色在当前对话中的独立历史记录
        const roleSpecificMessages = getRoleConversationHistory(currentRole.id, conversations[currentConversationIndex].id);
        
        // 构建上下文：使用该AI在当前对话中的独立历史记录 + 当前用户输入
        const contextMessages = [...roleSpecificMessages];
        contextMessages.push({ role: 'user', content: userInputContent });
        
        let requestBody = null;
        try {
            const url = getApiUrl();
            const headers = getApiHeaders();
            requestBody = getApiRequestBodyForRole(currentRole.prompt, contextMessages);
            
            const response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`API错误: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            const aiReply = data.choices[0].message.content;
            
            // 清理AI回复中的重复昵称
            const cleanedReply = cleanDuplicateNickname(aiReply, currentRole.name);
            
            // 更新该AI角色在当前对话中的独立历史记录
            // 角色自己的回复不包含昵称，这样在下一轮时不会看到重复的昵称
            const updatedHistory = [
                ...roleSpecificMessages,
                { role: 'user', content: userInputContent },
                { role: 'assistant', content: cleanedReply, aiName: currentRole.name }
            ];
            updateRoleConversationHistory(currentRole.id, conversations[currentConversationIndex].id, updatedHistory);
            
            // 记录日志
            if (enableLogging) {
                logApiRequest(currentRole.name, requestBody, data);
            }
            
            return {
                name: currentRole.name,
                content: cleanedReply
            };
            
        } catch (error) {
            console.error('AI回复错误:', error);
            const errorMsg = `角色"${currentRole.name}"回复失败: ${error.message}`;
            addErrorMessageToUI(errorMsg);
            
            if (enableLogging) {
                logApiError(currentRole.name, requestBody, error);
            }
            
            return null;
        }
    });
    
    // 等待所有AI回复完成
    const results = await Promise.all(promises);
    const successfulReplies = results.filter(reply => reply !== null);
    
    // 添加消息到对话
    if (successfulReplies.length > 0) {
        // 不再回填包含其他AI回复的用户消息到对话，避免重复显示
        // 仅添加AI回复到对话与界面
        successfulReplies.forEach((reply) => {
            addMessageToConversation('assistant', reply.content, reply.name);
            addMessageToUI('assistant', reply.content, reply.name);
        });
        
        // 更新对话标题
        if (conversations[currentConversationIndex].messages.length === 1) {
            const title = userMessage.substring(0, 20) + (userMessage.length > 20 ? '...' : '');
            conversations[currentConversationIndex].title = title;
            renderConversationsList();
        }
        
        saveConversations();
        scrollToBottom(true);
    }
}

// 记录API请求日志
function logApiRequest(roleName, requestBody, responseData) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp: timestamp,
        type: 'api_request',
        role: roleName,
        request: {
            model: requestBody.model,
            messages: requestBody.messages
        },
        response: {
            choices: responseData.choices,
            usage: responseData.usage,
            model: responseData.model
        }
    };
    
    // 保存到localStorage
    saveLogEntry(logEntry);
}

// 记录API错误日志
function logApiError(roleName, requestBody, error) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp: timestamp,
        type: 'api_error',
        role: roleName,
        request: {
            model: requestBody.model,
            messages: requestBody.messages
        },
        error: {
            message: error.message,
            stack: error.stack
        }
    };
    
    // 保存到localStorage
    saveLogEntry(logEntry);
}

// 保存日志条目
function saveLogEntry(logEntry) {
    try {
        const existingLogs = localStorage.getItem('apiLogs') || '[]';
        const logs = JSON.parse(existingLogs);
        
        // 限制日志数量，最多保存1000条
        if (logs.length >= 1000) {
            logs.shift(); // 删除最旧的日志
        }
        
        logs.push(logEntry);
        localStorage.setItem('apiLogs', JSON.stringify(logs));
    } catch (error) {
        console.error('保存日志失败:', error);
    }
}

// 导出日志
function exportLogs() {
    try {
        const logs = localStorage.getItem('apiLogs') || '[]';
        const parsedLogs = JSON.parse(logs);
        
        if (parsedLogs.length === 0) {
            alert('暂无日志记录');
            return;
        }
        
        const logData = {
            exportTime: new Date().toISOString(),
            totalLogs: parsedLogs.length,
            logs: parsedLogs
        };
        
        const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `api_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`成功导出 ${parsedLogs.length} 条日志记录`);
    } catch (error) {
        console.error('导出日志失败:', error);
        alert('导出日志失败: ' + error.message);
    }
}

// 清空日志
function clearLogs() {
    if (confirm('确定要清空所有日志记录吗？此操作不可恢复。')) {
        localStorage.removeItem('apiLogs');
        alert('日志已清空');
        updateLogManagementSection();
    }
}

// 更新日志管理区域的显示状态
function updateLogManagementSection() {
    if (enableLoggingInput.checked) {
        logManagementSection.style.display = 'block';
        
        // 显示日志统计信息
        const logs = localStorage.getItem('apiLogs') || '[]';
        const parsedLogs = JSON.parse(logs);
        const totalLogs = parsedLogs.length;
        
        if (totalLogs > 0) {
            const latestLog = parsedLogs[parsedLogs.length - 1];
            const latestTime = new Date(latestLog.timestamp).toLocaleString('zh-CN');
            logInfo.textContent = `共 ${totalLogs} 条日志，最新: ${latestTime}`;
        } else {
            logInfo.textContent = '暂无日志记录';
        }
    } else {
        logManagementSection.style.display = 'none';
    }
}

// 设置日志相关的事件监听器
function setupLogEventListeners() {
    if (enableLoggingInput) {
        enableLoggingInput.addEventListener('change', updateLogManagementSection);
    }
    
    if (exportLogsBtn) {
        exportLogsBtn.addEventListener('click', exportLogs);
    }
    
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', clearLogs);
    }
}

// 获取AI角色在指定对话中的独立历史记录
function getRoleConversationHistory(roleId, conversationId) {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) return [];
    
    if (!conversation.roleHistories) {
        conversation.roleHistories = {};
    }
    
    if (!conversation.roleHistories[roleId]) {
        conversation.roleHistories[roleId] = [];
    }
    
    return conversation.roleHistories[roleId];
}

// 获取上一轮其他AI的回复
function getPreviousRoundReplies() {
    const conversation = conversations[currentConversationIndex];
    if (!conversation || !conversation.roleHistories) return [];
    
    const previousReplies = [];
    
    // 遍历所有AI角色，获取它们上一轮的最后回复
    for (const role of aiRoles) {
        const roleHistory = conversation.roleHistories[role.id];
        if (roleHistory && roleHistory.length > 0) {
            // 找到该角色上一轮的最后回复
            const lastMessage = roleHistory[roleHistory.length - 1];
            if (lastMessage.role === 'assistant' && lastMessage.aiName === role.name) {
                // 其他AI的回复包含昵称，自己的回复不包含昵称
                // 这里我们总是添加昵称，因为这是给角色1看的，角色1需要知道是哪个AI的回复
                previousReplies.push(`[${role.name}]：${lastMessage.content}`);
            }
        }
    }
    
    return previousReplies;
}

// 更新AI角色在指定对话中的独立历史记录
function updateRoleConversationHistory(roleId, conversationId, messages) {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) return;
    
    if (!conversation.roleHistories) {
        conversation.roleHistories = {};
    }
    
    conversation.roleHistories[roleId] = messages;
    
    // 限制历史记录长度
    if (conversation.roleHistories[roleId].length > 40) {
        conversation.roleHistories[roleId] = conversation.roleHistories[roleId].slice(-40);
    }
}

// 自动压缩当前对话：将较早的消息压缩为摘要，保留最近historyLimit条
async function autoCompressCurrentConversationIfNeeded() {
    try {
        if (!autoCompressEnabled) return;
        const conv = conversations[currentConversationIndex];
        if (!conv || !Array.isArray(conv.messages)) return;

        const nonSystemMessages = conv.messages.filter(m => m.role !== 'system');
        if (nonSystemMessages.length < autoCompressThreshold) return;

        // 保留最近historyLimit条，压缩其之前的消息
        const keepCount = Math.max(1, historyLimit || 10);
        const toKeep = nonSystemMessages.slice(-keepCount);
        const toCompress = nonSystemMessages.slice(0, nonSystemMessages.length - keepCount);
        if (toCompress.length === 0) return;

        // 构建压缩请求：使用现有API接口
        const rolePrompt = aiRoles[currentRoleIndex]?.prompt || '';
        const combinedPrompt = `${systemPrompt}\n\n角色设定：${rolePrompt}\n\n你是一名对话压缩助手。请将给定的历史对话内容总结为一段结构清晰的摘要，保留关键事实、结论、任务和未决事项。避免丢失重要上下文，避免逐条复述，长度尽量精炼。`;
        const systemMessage = { role: 'system', content: combinedPrompt };
        const userSummaryRequest = {
            role: 'user',
            content: `以下是较早的历史消息，请压缩为摘要：\n\n${toCompress.map(m => `[${m.role === 'user' ? (userName || '用户') : (m.aiName || '助手')}] ${m.content}`).join('\n')}`
        };

        const url = getApiUrl();
        const headers = getApiHeaders();
        const body = { model: apiProvider === 'openai' ? 'gpt-3.5-turbo' : 'deepseek-chat', messages: [systemMessage, userSummaryRequest] };
        const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!response.ok) throw new Error(`压缩API错误: ${response.status} - ${response.statusText}`);
        const data = await response.json();
        const summary = getApiResponseContent(data);

        // 用一个摘要消息替换被压缩的历史
        const summaryMessage = { role: 'assistant', content: `【对话摘要】\n${summary}` };

        // 重建对话：保留系统消息、摘要、最近消息（存储逻辑保持不变）
        const systemMessages = conv.messages.filter(m => m.role === 'system');
        conv.messages = [...systemMessages, summaryMessage, ...toKeep];

        // 标题可选优化：标记已压缩
        conv.title = conv.title || `对话-${conv.id || ''}`;
        if (!/（已压缩）/.test(conv.title)) {
            conv.title = `${conv.title}（已压缩）`;
        }

        saveConversations();
        renderConversationsList();
        // 刷新当前对话，使摘要作为顶部消息立即显示
        if (currentConversationIndex >= 0 && currentConversationIndex < conversations.length) {
            displayCurrentConversation();
        }
    } catch (err) {
        console.error('自动压缩失败:', err);
        // 保守处理：不打断正常流程
    }
}