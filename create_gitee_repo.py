import requests

token = "8ef1b27f2d45d54128170ba6f80f5a19"
url = "https://gitee.com/api/v5/user/repos"
data = {
    "access_token": token,
    "name": "checkin",
    "private": False,
    "description": "Checkin App Frontend"
}

response = requests.post(url, json=data)
print(response.status_code)
print(response.text)
