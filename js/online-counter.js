// --- FIREBASE ONLINE COUNTER ---

document.addEventListener('DOMContentLoaded', () => {
    try {
        //
        // --- QUAN TRỌNG: Dán thông tin cấu hình Firebase của bạn vào đây ---
        //
        const firebaseConfig = {
            apiKey: "AIzaSyATtcNjdiHLGjDco4EWyz-4k_fWXiOz0dk",
            authDomain: "trac-nghiem-soa-counter.firebaseapp.com",
            projectId: "trac-nghiem-soa-counter",
            storageBucket: "trac-nghiem-soa-counter.firebasestorage.app",
            messagingSenderId: "96171020489",
            appId: "1:96171020489:web:163dbc7a1d4bfed909fd18"
        };
        // -------------------------------------------------------------------
        //

        // Kiểm tra xem firebaseConfig đã được điền chưa
        if (!firebaseConfig.apiKey) {
            console.warn("Firebase config is missing in js/online-counter.js. The online counter will not work.");
            const widget = document.getElementById('online-counter-widget');
            if (widget) widget.style.display = 'none';
            return;
        }

        // 2. Khởi tạo Firebase
        firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

        // 3. 'presences' là nơi chúng ta lưu trạng thái online của mọi người
        //    Mỗi người vào sẽ tạo một "dấu vết" ở đây
        const presencesRef = db.ref("presences");

        // 4. Theo dõi trạng thái kết nối của chính client này
        const connectedRef = db.ref(".info/connected");

        connectedRef.on("value", (snap) => {
            if (snap.val() === true) {
                // Người dùng đang kết nối mạng và kết nối tới Firebase thành công.

                // Tạo một "dấu vết" duy nhất cho người dùng này trong 'presences'
                const con = presencesRef.push(true);

                // **Điều kỳ diệu xảy ra ở đây:**
                // Lên lịch một hành động xóa "dấu vết" này khi người dùng ngắt kết nối
                // (đóng tab, tắt trình duyệt, mất mạng).
                // Việc này được thực hiện trên máy chủ của Firebase.
                con.onDisconnect().remove();
            }
        });

        // 5. Lắng nghe sự thay đổi của tổng số "dấu vết" và cập nhật UI
        const onlineCountSpan = document.getElementById('online-count');
        presencesRef.on("value", (snap) => {
            // snap.numChildren() là cách hiệu quả để đếm số người đang online
            const count = snap.numChildren();
            if (onlineCountSpan) {
                // Hiển thị số lượng lên giao diện
                onlineCountSpan.textContent = count > 0 ? count : 1;
            }
        });

    } catch (error) {
        console.error("Firebase initialization failed:", error);
        // Ẩn widget đi nếu có lỗi xảy ra để không làm ảnh hưởng người dùng
        const widget = document.getElementById('online-counter-widget');
        if (widget) {
            widget.style.display = 'none';
        }
    }
});
