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
    const loadingOverlay = document.getElementById('loading-overlay');

    // --- BIẾN TRẠNG THÁI ---
    let allQuestionsData = [];
    let currentTopic = null;
    let currentMode = '';

    // --- CÁC HÀM TIỆN ÍCH ---
    
    // Hiển thị loading animation
    const showLoading = (message = 'Đang tải...') => {
        const loadingText = loadingOverlay.querySelector('p');
        if (loadingText) loadingText.textContent = message;
        loadingOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    // Ẩn loading animation
    const hideLoading = () => {
        loadingOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    // Thêm hiệu ứng stagger cho các element
    const addStaggerAnimation = (elements, baseDelay = 50) => { // Giảm baseDelay
        elements.forEach((element, index) => {
            element.style.animationDelay = `${index * baseDelay}ms`;
            element.classList.add('stagger-animate');
        });
    };

    // Escape và format text với hiệu ứng
    const escapeAndFormatText = (text = '') => {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
        return text.replace(/[&<>"']/g, m => map[m]).replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    };

    // --- CÁC HÀM XỬ LÝ CHÍNH ---

    // 1. Chuyển đổi giữa các giao diện với hiệu ứng
    const switchView = (viewName) => {
        if (viewName === 'topic') {
            quizView.style.display = 'none';
            setTimeout(() => {
                topicSelectionView.style.display = 'block';
                topicSelectionView.style.animation = 'fadeInUp 0.5s ease-out'; // Tăng tốc animation
            }, 50); // Giảm delay
        } else {
            topicSelectionView.style.display = 'none';
            setTimeout(() => {
                quizView.style.display = 'block';
                quizView.style.animation = 'fadeInUp 0.5s ease-out'; // Tăng tốc animation
            }, 50); // Giảm delay
        }
    };

    // 2. Tìm và hiển thị các đề thi với loading
    const discoverAndShowTopics = async () => {
        switchView('topic');
        showLoading('Đang tìm kiếm đề thi...');
        
        try {
            const maxTopics = 50;
            const promises = Array.from({ length: maxTopics }, (_, i) => {
                const fileName = `De_${i + 1}.json`;
                return fetch(`data/${fileName}`)
                    .then(res => res.ok ? ({ file: fileName, name: `Đề số ${i + 1}` }) : null)
                    .catch(() => null);
            });
            const topics = (await Promise.all(promises)).filter(Boolean);
            
            hideLoading();
            
            topicListContainer.innerHTML = '';
            if (topics.length === 0) {
                topicListContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px; color: #ffc107;"></i>
                        <p style="font-size: 1.2rem;">Không tìm thấy đề thi nào.</p>
                        <p>Vui lòng kiểm tra thư mục data và các file JSON.</p>
                    </div>`;
                return;
            }
            
            // Tạo các nút đề thi với hiệu ứng stagger nhanh hơn
            topics.forEach((topic, index) => {
                const btn = document.createElement('button');
                btn.className = 'topic-btn';
                btn.innerHTML = `
                    <i class="fas fa-file-alt" style="margin-right: 10px;"></i>
                    ${topic.name}
                `;
                btn.style.animationDelay = `${index * 50}ms`; // Giảm delay
                btn.onclick = () => selectTopic(topic);
                topicListContainer.appendChild(btn);
            });
        } catch (error) {
            hideLoading();
            topicListContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-times-circle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                    <p style="font-size: 1.2rem;">Có lỗi xảy ra khi tải danh sách đề thi</p>
                    <p>${error.message}</p>
                </div>`;
        }
    };

    // 3. Xử lý khi người dùng chọn một đề với loading
    const selectTopic = async (topic) => {
        currentTopic = topic;
        showLoading(`Đang tải ${topic.name}...`);
        
        try {
            await new Promise(resolve => setTimeout(resolve, 200)); // Giảm đáng kể thời gian giả lập loading
            
            switchView('quiz');
            quizTitle.innerHTML = `
                <i class="fas fa-clipboard-list" style="margin-right: 10px;"></i>
                ${topic.name}
            `;
            resetQuizState();

            const response = await fetch(`data/${topic.file}`);
            if (!response.ok) throw new Error('Không thể tải file đề thi.');
            const rawData = await response.json();
            allQuestionsData = rawData.map(q => ({
                ...q,
                options: Object.entries(q.options || {}).map(([letter, text]) => ({ letter, text }))
            }));
            hideLoading();
            
            quizContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; background: rgba(78, 205, 196, 0.1); border-radius: 12px; border: 1px solid rgba(78, 205, 196, 0.3);">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: #4ecdc4; margin-bottom: 20px;"></i>
                    <h3 style="color: #4ecdc4; margin-bottom: 15px;">Đã tải thành công!</h3>
                    <p style="font-size: 1.1rem; color: #666;">Tìm thấy <strong>${allQuestionsData.length}</strong> câu hỏi</p>
                    <p style="margin-top: 20px; font-style: italic;">Vui lòng chọn một chế độ học tập ở trên để bắt đầu.</p>
                </div>`;
        } catch (error) {
            hideLoading();
            quizContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; background: rgba(255, 107, 107, 0.1); border-radius: 12px; border: 1px solid rgba(255, 107, 107, 0.3);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b; margin-bottom: 20px;"></i>
                    <h3 style="color: #ff6b6b; margin-bottom: 15px;">Lỗi tải đề thi</h3>
                    <p style="color: #666;">${error.message}</p>
                </div>`;
        }
    };
    
    // 4. Reset trạng thái giao diện làm bài
    const resetQuizState = () => {
        currentMode = '';
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
        if (currentMode === mode && !quizContainer.querySelector('.mode-selection-prompt')) {
            return;
        }

        currentMode = mode;
        const modeTexts = {
            preview: '👁️ Xem trước tất cả đáp án và giải thích chi tiết.',
            practice: '💪 Click vào đáp án để xem kết quả ngay lập tức và học từ sai lầm.',
            test: '📝 Làm bài kiểm tra nghiêm túc và nộp để xem kết quả cuối cùng.'
        };
        
        quizModeText.style.opacity = '0';
        setTimeout(() => {
            quizModeText.innerHTML = `
                <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                ${modeTexts[mode]}
            `;
            quizModeText.style.opacity = '1';
        }, 100); // Giảm delay
        resultContainer.innerHTML = '';

        modeSelectionContainer.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
            if (btn.dataset.mode === mode) {
                btn.style.animation = 'pulse 0.5s ease';
            }
        });
        controlsContainer.style.display = mode === 'test' ? 'block' : 'none';
        submitButton.style.display = 'block';
        retryButton.style.display = 'none';
        floatingRefreshBtn.style.display = mode === 'practice' ? 'flex' : 'none';

        showLoading('Đang chuẩn bị câu hỏi...');
        setTimeout(() => {
            displayQuestions();
            hideLoading();
        }, 300); // Giảm đáng kể thời gian chờ
    };

    // 6. Hiển thị câu hỏi lên giao diện với animation
    const displayQuestions = () => {
        quizContainer.innerHTML = '';
        allQuestionsData.forEach((qData, index) => {
            const questionBlock = document.createElement('div');
            questionBlock.className = 'question-block';
            questionBlock.style.animationDelay = `${index * 70}ms`; // Giảm delay
            
            const optionsHtml = qData.options.map((opt, optIndex) => {
                const optionId = `q${index}o${optIndex}`;
                return `
                    <li class="option-item" style="animation-delay: ${(index * 70) + (optIndex * 35)}ms;">
                        <input type="radio" name="question${index}" value="${opt.letter}" id="${optionId}" ${currentMode === 'preview' ? 'disabled' : ''}>
                        <label for="${optionId}">
                            <strong>${opt.letter}.</strong> ${escapeAndFormatText(opt.text)}
                        </label>
                    </li>`;
            }).join('');

            questionBlock.innerHTML = `
                <div class="question-text">
                    <i class="fas fa-question-circle" style="margin-right: 10px; color: #667eea;"></i>
                    <strong>Câu ${index + 1}:</strong> ${escapeAndFormatText(qData.question_text)}
                </div>
                <ul class="options-list">${optionsHtml}</ul>
                <div class="explanation" style="display: none;"></div>`;
            
            quizContainer.appendChild(questionBlock);

            if (currentMode === 'preview') {
                setTimeout(() => showAnswer(questionBlock, qData, true), index * 100); // Giảm delay
            } else if (currentMode === 'practice') {
                questionBlock.querySelectorAll('.option-item').forEach(item => {
                    item.onclick = () => {
                        if (item.parentElement.classList.contains('answered')) return;
                        
                        item.style.transform = 'scale(0.95)';
                        setTimeout(() => {
                            item.style.transform = '';
                        }, 100);
                        item.parentElement.classList.add('answered');
                        const radio = item.querySelector('input');
                        radio.checked = true;
                        
                        setTimeout(() => {
                            showAnswer(questionBlock, qData, radio.value === qData.correct_answer, radio);
                        }, 200); // Giảm delay
                    };
                });
            }
        });
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 250); // Giảm delay
    };

    // 7. Hàm chung để hiển thị đáp án và giải thích với animation
    const showAnswer = (questionBlock, qData, isCorrect, selectedRadio = null) => {
        const correctOptionItem = Array.from(questionBlock.querySelectorAll('.option-item'))
            .find(item => item.querySelector('input').value === qData.correct_answer);
        if (correctOptionItem) {
            setTimeout(() => {
                correctOptionItem.classList.add('correct');
                correctOptionItem.style.animation = 'fadeInUp 0.4s ease-out';
            }, 50);
        }

        if (!isCorrect && selectedRadio) {
            setTimeout(() => {
                selectedRadio.closest('.option-item').classList.add('incorrect');
                selectedRadio.closest('.option-item').style.animation = 'fadeInUp 0.4s ease-out';
            }, 50);
        }
        
        if (qData.explanation) {
            const explanationDiv = questionBlock.querySelector('.explanation');
            setTimeout(() => {
                explanationDiv.innerHTML = `
                    <i class="fas fa-lightbulb" style="margin-right: 8px; color: #667eea;"></i>
                    <strong>Giải thích:</strong> ${escapeAndFormatText(qData.explanation)}
                `;
                explanationDiv.style.display = 'block';
                explanationDiv.style.animation = 'fadeInUp 0.5s ease-out';
            }, 50);
        }

        questionBlock.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = true);
        questionBlock.classList.add('practice-answered');
    };
    // 8. Xử lý nộp bài cho chế độ kiểm tra với animation
    const handleSubmitTest = () => {
        showLoading('Đang chấm bài...');
        setTimeout(() => {
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
                
                setTimeout(() => {
                    showAnswer(questionBlock, qData, isCorrect, selectedRadio);
                }, index * 50); // Giảm delay
            });

            const percentage = Math.round((score / allQuestionsData.length) * 100);
            let resultColor = '#ff6b6b';
            let resultIcon = 'fas fa-times-circle';
            if (percentage >= 80) {
                resultColor = '#4ecdc4';
                resultIcon = 'fas fa-trophy';
            } else if (percentage >= 60) {
                resultColor = '#ffc107';
                resultIcon = 'fas fa-medal';
            }

            let resultMessage = `
                <div style="background: rgba(${resultColor === '#4ecdc4' ? '78, 205, 196' : resultColor === '#ffc107' ? '255, 193, 7' : '255, 107, 107'}, 0.1); 
                            border-radius: 16px; padding: 30px; border: 1px solid rgba(${resultColor === '#4ecdc4' ? '78, 205, 196' : resultColor === '#ffc107' ? '255, 193, 7' : '255, 107, 107'}, 0.3);">
                    <i class="${resultIcon}" style="font-size: 3rem; color: ${resultColor}; margin-bottom: 20px;"></i>
                    <h3 style="color: ${resultColor}; margin-bottom: 15px;">Kết quả bài thi</h3>
                    <div style="font-size: 2rem; font-weight: bold; color: ${resultColor}; margin: 20px 0;">${score}/${allQuestionsData.length}</div>
                    <div style="font-size: 1.2rem; color: #666; margin-bottom: 20px;">${percentage}% - ${percentage >= 80 ? 'Xuất sắc!' : percentage >= 60 ? 'Tốt!' : 'Cần cố gắng thêm!'}</div>
            `;
            if (unansweredQuestions > 0) {
                resultMessage += `<p style="color: #666; font-style: italic;">📝 Bạn đã bỏ qua ${unansweredQuestions} câu hỏi.</p>`;
            }
            
            resultMessage += `</div>`;
            hideLoading();
            
            resultContainer.innerHTML = resultMessage;
            resultContainer.style.animation = 'fadeInUp 0.6s ease-out';

            submitButton.style.display = 'none';
            retryButton.style.display = 'inline-flex';
            setTimeout(() => {
                resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 250); // Giảm delay
        }, 800); // Giảm đáng kể thời gian chấm bài
    };

    // --- GẮN SỰ KIỆN VỚI HIỆU ỨNG ---
    
    modeSelectionContainer.addEventListener('click', e => {
        if (e.target.classList.contains('mode-btn') || e.target.closest('.mode-btn')) {
            const btn = e.target.classList.contains('mode-btn') ? e.target : e.target.closest('.mode-btn');
            selectMode(btn.dataset.mode);
        }
    });
    quizForm.addEventListener('submit', e => { 
        e.preventDefault(); 
        if (currentMode === 'test') {
            submitButton.style.transform = 'scale(0.95)';
            setTimeout(() => {
                submitButton.style.transform = '';
                handleSubmitTest();
            }, 100); // Giảm delay
        }
    });
    retryButton.addEventListener('click', () => {
        retryButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            retryButton.style.transform = '';
            selectMode(currentMode);
        }, 100); // Giảm delay
    });
    backButton.addEventListener('click', () => {
        backButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            backButton.style.transform = '';
            discoverAndShowTopics();
        }, 100); // Giảm delay
    });
    floatingRefreshBtn.addEventListener('click', () => { 
        if (currentMode === 'practice') {
            floatingRefreshBtn.style.transform = 'scale(0.9) rotate(180deg)';
            setTimeout(() => {
                floatingRefreshBtn.style.transform = '';
                displayQuestions();
            }, 200); // Giảm delay
        }
    });
    
    // --- KHỞI CHẠY ---
    discoverAndShowTopics();
    // Thêm một số hiệu ứng bổ sung
    document.addEventListener('click', (e) => {
        // Hiệu ứng ripple cho các button
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            const btn = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
            const ripple = document.createElement('span');
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;
            
            btn.style.position = 'relative';
            btn.style.overflow = 'hidden';
            btn.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        }
    });
    // Thêm CSS cho ripple effect
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
        
        .stagger-animate {
            animation: fadeInUp 0.5s ease-out both; /* Tăng tốc animation */
        }
    `;
    document.head.appendChild(style);
});