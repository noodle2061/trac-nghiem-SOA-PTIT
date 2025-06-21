document.addEventListener('DOMContentLoaded', () => {
    // --- CÁC PHẦN TỬ DOM ---
    const topicSelectionView = document.getElementById('topic-selection-view');
    const quizView = document.getElementById('quiz-view');
    const topicListContainer = document.getElementById('topic-list');
    const quizContainer = document.getElementById('quiz-container');
    const resultContainer = document.getElementById('result-container');
    const quizForm = document.getElementById('quiz-form');
    const quizTitle = document.getElementById('quiz-title');
    const quizModeText = document.getElementById('quiz-mode-text');
    const modeSelectionContainer = document.getElementById('mode-selection-container');
    const submitButton = document.getElementById('submit-btn');
    const retryButton = document.getElementById('retry-btn');
    const backButton = document.getElementById('back-btn');
    const controlsContainer = document.getElementById('controls-container');
    const floatingRefreshBtn = document.getElementById('floating-refresh-btn');

    // --- BIẾN TRẠNG THÁI ---
    let allQuestionsData = [];
    let currentTopic = null;
    let currentMode = '';

    // --- CÁC HÀM XỬ LÝ CHÍNH ---

    // 1. Chuyển đổi giữa các giao diện
    const switchView = (viewName) => {
        topicSelectionView.style.display = viewName === 'topic' ? 'block' : 'none';
        quizView.style.display = viewName === 'quiz' ? 'block' : 'none';
    };

    // 2. Tìm và hiển thị các đề thi
    const discoverAndShowTopics = async () => {
        switchView('topic');
        topicListContainer.innerHTML = '<p>Đang tìm kiếm đề thi...</p>';
        const maxTopics = 50;
        const promises = Array.from({ length: maxTopics }, (_, i) => {
            const fileName = `De_${i + 1}.json`;
            return fetch(`data/${fileName}`)
                .then(res => res.ok ? ({ file: fileName, name: `Đề số ${i + 1}` }) : null)
                .catch(() => null);
        });
        const topics = (await Promise.all(promises)).filter(Boolean);
        
        topicListContainer.innerHTML = '';
        if (topics.length === 0) {
            topicListContainer.innerHTML = '<p>Không tìm thấy đề thi nào.</p>';
            return;
        }
        topics.forEach(topic => {
            const btn = document.createElement('button');
            btn.className = 'topic-btn';
            btn.textContent = topic.name;
            btn.onclick = () => selectTopic(topic);
            topicListContainer.appendChild(btn);
        });
    };

    // 3. Xử lý khi người dùng chọn một đề
    const selectTopic = async (topic) => {
        currentTopic = topic;
        switchView('quiz');
        quizTitle.textContent = topic.name;
        resetQuizState();

        try {
            const response = await fetch(`data/${topic.file}`);
            if (!response.ok) throw new Error('Không thể tải file đề thi.');
            const rawData = await response.json();
            
            allQuestionsData = rawData.map(q => ({
                ...q,
                options: Object.entries(q.options || {}).map(([letter, text]) => ({ letter, text }))
            }));

        } catch (error) {
            quizContainer.innerHTML = `<p>Lỗi tải đề: ${error.message}</p>`;
        }
    };
    
    // 4. Reset trạng thái giao diện làm bài
    const resetQuizState = () => {
        currentMode = '';
        quizContainer.innerHTML = '<p>Vui lòng chọn một chế độ học tập ở trên.</p>';
        resultContainer.innerHTML = '';
        quizModeText.textContent = '';
        controlsContainer.style.display = 'none';
        floatingRefreshBtn.style.display = 'none';
        modeSelectionContainer.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    };

    // 5. Xử lý khi người dùng chọn một chế độ
    const selectMode = (mode) => {
        if (currentMode === mode && quizContainer.innerHTML !== '<p>Vui lòng chọn một chế độ học tập ở trên.</p>') {
            return;
        }

        currentMode = mode;
        const modeTexts = {
            preview: 'Xem trước đáp án và giải thích.',
            practice: 'Click vào đáp án để xem kết quả ngay lập tức.',
            test: 'Làm bài và nộp để xem kết quả cuối cùng.'
        };
        quizModeText.textContent = modeTexts[mode];
        resultContainer.innerHTML = '';

        modeSelectionContainer.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        controlsContainer.style.display = mode === 'test' ? 'block' : 'none';
        submitButton.style.display = 'block';
        retryButton.style.display = 'none';
        floatingRefreshBtn.style.display = mode === 'practice' ? 'flex' : 'none';

        displayQuestions();
    };

    // 6. Hiển thị câu hỏi lên giao diện
    const displayQuestions = () => {
        quizContainer.innerHTML = '';
        allQuestionsData.forEach((qData, index) => {
            const questionBlock = document.createElement('div');
            questionBlock.className = 'question-block';
            
            const optionsHtml = qData.options.map((opt, optIndex) => {
                const optionId = `q${index}o${optIndex}`;
                return `
                    <li class="option-item">
                        <input type="radio" name="question${index}" value="${opt.letter}" id="${optionId}" ${currentMode === 'preview' ? 'disabled' : ''}>
                        <label for="${optionId}">${opt.letter}. ${escapeAndFormatText(opt.text)}</label>
                    </li>`;
            }).join('');

            // *** THAY ĐỔI: Thêm số thứ tự câu hỏi ***
            questionBlock.innerHTML = `
                <div class="question-text"><strong>Câu ${index + 1}:</strong> ${escapeAndFormatText(qData.question_text)}</div>
                <ul class="options-list">${optionsHtml}</ul>
                <div class="explanation" style="display: none;"></div>`;
            quizContainer.appendChild(questionBlock);

            if (currentMode === 'preview') {
                showAnswer(questionBlock, qData, true);
            } else if (currentMode === 'practice') {
                questionBlock.querySelectorAll('.option-item').forEach(item => {
                    item.onclick = () => {
                        if (item.parentElement.classList.contains('answered')) return;
                        item.parentElement.classList.add('answered');
                        const radio = item.querySelector('input');
                        radio.checked = true;
                        showAnswer(questionBlock, qData, radio.value === qData.correct_answer, radio);
                    };
                });
            }
        });
    };

    // 7. Hàm chung để hiển thị đáp án và giải thích
    const showAnswer = (questionBlock, qData, isCorrect, selectedRadio = null) => {
        const correctOptionItem = Array.from(questionBlock.querySelectorAll('.option-item')).find(item => item.querySelector('input').value === qData.correct_answer);
        if (correctOptionItem) {
            correctOptionItem.classList.add('correct');
        }

        if (!isCorrect && selectedRadio) {
            selectedRadio.closest('.option-item').classList.add('incorrect');
        }
        
        if (qData.explanation) {
            const explanationDiv = questionBlock.querySelector('.explanation');
            explanationDiv.innerHTML = `<strong>Giải thích:</strong> ${escapeAndFormatText(qData.explanation)}`;
            explanationDiv.style.display = 'block';
        }

        questionBlock.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = true);
    };

    // 8. Xử lý nộp bài cho chế độ kiểm tra
    const handleSubmitTest = () => {
        let score = 0;
        let unansweredQuestions = 0;
        allQuestionsData.forEach((qData, index) => {
            const questionBlock = quizContainer.children[index];
            const selectedRadio = quizForm.querySelector(`input[name="question${index}"]:checked`);
            
            if (!selectedRadio) {
                unansweredQuestions++;
            }

            const isCorrect = selectedRadio && selectedRadio.value === qData.correct_answer;
            if (isCorrect) score++;
            showAnswer(questionBlock, qData, isCorrect, selectedRadio);
        });

        let resultMessage = `<h3>Kết quả: Bạn đã trả lời đúng ${score}/${allQuestionsData.length} câu!</h3>`;
        if (unansweredQuestions > 0) {
            resultMessage += `<p>Bạn đã bỏ qua ${unansweredQuestions} câu.</p>`;
        }
        resultContainer.innerHTML = resultMessage;

        submitButton.style.display = 'none';
        retryButton.style.display = 'block';
        window.scrollTo(0, 0);
    };

    // --- CÁC HÀM TIỆN ÍCH VÀ GẮN SỰ KIỆN ---
    const escapeAndFormatText = (text = '') => {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
        return text.replace(/[&<>"']/g, m => map[m]).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    };

    modeSelectionContainer.addEventListener('click', e => {
        if (e.target.classList.contains('mode-btn')) {
            selectMode(e.target.dataset.mode);
        }
    });

    quizForm.addEventListener('submit', e => { e.preventDefault(); if (currentMode === 'test') handleSubmitTest(); });
    retryButton.addEventListener('click', () => selectMode(currentMode));
    backButton.addEventListener('click', discoverAndShowTopics);
    floatingRefreshBtn.addEventListener('click', () => { if (currentMode === 'practice') displayQuestions(); });
    
    // --- KHỞI CHẠY ---
    discoverAndShowTopics();
});
