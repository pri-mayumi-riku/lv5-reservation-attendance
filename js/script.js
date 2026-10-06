// 生徒の固定データ（名前はすべて架空）
const students = [
    { id: 1, name: "山田 太郎" },
    { id: 2, name: "佐藤 花子" },
    { id: 3, name: "鈴木 一郎" },
    { id: 4, name: "高橋 美咲" },
    { id: 5, name: "田中 健太" },
    { id: 6, name: "伊藤 さくら" },
    { id: 7, name: "渡辺 大輝" },
    { id: 8, name: "中村 結衣" },
    { id: 9, name: "池田 太郎" },
    { id: 10, name: "木村 美咲" },
    { id: 11, name: "林 健介" },
    { id: 12, name: "清水 由美" },
    { id: 13, name: "山本 翔太" },
    { id: 14, name: "佐々木 彩花" },
    { id: 15, name: "阿部 隆一" }
];

const studentSelect = document.getElementById("student-select");

/** タブの切り替え処理 */
function setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabPanels = document.querySelectorAll(".tab-panel");

    tabButtons.forEach((button, index) => {
        button.addEventListener("click", () => {
            tabPanels.forEach((panel) => panel.classList.remove("active"));
            tabButtons.forEach((tabButton) => tabButton.classList.remove("active"));

            button.classList.add("active");
            tabPanels[index].classList.add("active");
        });
    });
}

// 読み込み完了後の処理
document.addEventListener("DOMContentLoaded", () => {
    setupTabs();

    // 生徒のセレクトボックスの選択肢を作る
    students.forEach((student) => {
        studentSelect.innerHTML += `<option value="${student.id}">${student.name}</option>`;
    });

});
