import requests
import sys

token = "a329295fb61447f29bbe5cd6f4d8ccc5"

def get_user_info():
    url = f"https://gitee.com/api/v5/user?access_token={token}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error getting user info: {response.status_code} - {response.text}")
        return None

def create_repo(repo_name, description=""):
    url = "https://gitee.com/api/v5/user/repos"
    data = {
        "access_token": token,
        "name": repo_name,
        "description": description,
        "private": False,
        "has_issues": True,
        "has_wiki": True,
        "can_comment": True
    }
    response = requests.post(url, json=data)
    if response.status_code == 201:
        print(f"Repository '{repo_name}' created successfully.")
        return response.json()
    elif response.status_code == 400 and "name has already been taken" in response.text:
        print(f"Repository '{repo_name}' already exists.")
        return True
    else:
        print(f"Error creating repository '{repo_name}': {response.status_code} - {response.text}")
        return None

def check_file_exists(username, repo_name, path):
    url = f"https://gitee.com/api/v5/repos/{username}/{repo_name}/contents/{path}?access_token={token}"
    response = requests.get(url)
    return response.status_code == 200

def create_initial_data_file(username, repo_name, path):
    url = f"https://gitee.com/api/v5/repos/{username}/{repo_name}/contents/{path}"
    import base64
    content = base64.b64encode(b"{}").decode('utf-8')
    data = {
        "access_token": token,
        "content": content,
        "message": "initial data.json"
    }
    response = requests.post(url, json=data)
    if response.status_code == 201:
        print(f"File '{path}' created successfully in '{repo_name}'.")
        return True
    else:
        print(f"Error creating file '{path}': {response.status_code} - {response.text}")
        return False

user_info = get_user_info()
if user_info:
    username = user_info['login']
    print(f"Logged in as: {username}")
    
    # 1. 创建或检查代码仓库 (checkin)
    create_repo("checkin", "Checkin App Frontend")
    
    # 2. 创建或检查数据仓库 (checkin-data)
    create_repo("checkin-data", "Checkin App Data Storage")
    
    # 3. 在 checkin-data 中创建初始 data.json (如果不存在)
    if not check_file_exists(username, "checkin-data", "data.json"):
        create_initial_data_file(username, "checkin-data", "data.json")
    else:
        print("data.json already exists in checkin-data.")

    print(f"--- CONFIG ---")
    print(f"SYNC_URL: https://gitee.com/api/v5/repos/{username}/checkin-data/contents/data.json")
    print(f"SYNC_HEADERS: {{\"Authorization\": \"token {token}\"}}")
    print(f"GITEE_PAGES_URL: https://{username}.gitee.io/checkin/")
    print(f"GITEE_REPO_URL: https://gitee.com/{username}/checkin.git")
