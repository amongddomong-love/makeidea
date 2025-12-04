import os
import nbformat

# ✅ 변환 대상 폴더 경로
notebook_folder = r"C:\Users\amongpapa\chartup\go_scen\data"

# ✅ 로그 저장용 리스트
conversion_log = []

# ✅ 모든 .ipynb 파일 처리
for file in os.listdir(notebook_folder):
    if file.endswith(".ipynb"):
        file_path = os.path.join(notebook_folder, file)
        py_file_path = file_path.replace(".ipynb", ".py")

        try:
            # Jupyter 노트북 열기
            with open(file_path, "r", encoding="utf-8") as f:
                notebook = nbformat.read(f, as_version=4)

            # 코드 셀 추출
            code_cells = [cell.source for cell in notebook.cells if cell.cell_type == "code"]
            combined_code = "\n\n".join(code_cells)

            # Python 파일로 저장
            with open(py_file_path, "w", encoding="utf-8") as f:
                f.write(combined_code)

            print(f"✅ 변환 성공: {file}")
            conversion_log.append((file, "성공"))

        except Exception as e:
            print(f"❌ 변환 실패: {file} → {str(e)}")
            conversion_log.append((file, f"실패: {str(e)}"))

# ✅ 변환 결과 요약
print("\n📋 변환 결과 요약:")
for fname, result in conversion_log:
    print(f"- {fname}: {result}")


import os

# 📁 .bat 파일 저장 경로
bat_folder = r"C:\Users\amongpapa\chartup\go_scen\data"
os.makedirs(bat_folder, exist_ok=True)

# 📁 .py 파일이 있는 경로
target_py_folder = r"C:\Users\amongpapa\chartup\go_scen\data"

# 🔧 실행기 경로
PYTHON_EXE = r"C:\Users\amongpapa\anaconda3\python.exe"
PYTHONW_EXE = r"C:\Users\amongpapa\anaconda3\pythonw.exe"

# ✅ 로그 파일 저장 폴더
log_folder = os.path.join(target_py_folder, "bat_log")
os.makedirs(log_folder, exist_ok=True)

# 🎯 실행 대상 .py 파일 리스트
py_files = [
    "histo_ticker.py"
]

# 🔁 각각에 대해 .bat 생성
for py_file in py_files:
    bat_name = py_file.replace(".py", ".bat")
    bat_path = os.path.join(bat_folder, bat_name)
    full_py_path = os.path.join(target_py_folder, py_file)
    done_log_path = os.path.join(log_folder, py_file.replace(".py", "_done.txt"))

    if py_file == "1.topic.py":
        # 🖥️ GUI 실행 (콘솔창 없이)
        bat_content = f"""@echo off
start "" "{PYTHONW_EXE}" "{full_py_path}"
timeout /t 5 >nul
echo %DATE% %TIME% > "{done_log_path}"
"""
    elif py_file == "02.news_food.py":
        # ✅ 콘솔 창 실행 + 로그 저장 + 종료
        bat_content = f"""@echo off
chcp 65001 >nul
"{PYTHON_EXE}" "{full_py_path}"
echo %DATE% %TIME% > "{done_log_path}"
exit
"""
    else:
        # 기본 CLI 실행 (pause 없이)
        bat_content = f"""@echo off
chcp 65001 >nul
"{PYTHON_EXE}" "{full_py_path}"
echo %DATE% %TIME% > "{done_log_path}"
"""

    # 📝 .bat 파일 저장
    with open(bat_path, "w", encoding="utf-8") as f:
        f.write(bat_content)

    print(f"✅ 생성 완료: {bat_path}")


