import requests

# Your Discord webhook URL
webhook_url = "https://discord.com/api/webhooks/1423885039992701001/yMBkLZi5LFP46caXO9_mWYuIgoZXp4YY-mPwRdtxYbMzdOdD6-4UqM0XnrKm23_M4C5E"

# Message content
data = {
    "content": "Hello, this is a test message from your Python script!"
}

# Send the POST request to the webhook URL
response = requests.post(webhook_url, json=data)

if response.status_code == 204:
    print("Message sent successfully!")
else:
    print(f"Failed to send message. Status code: {response.status_code}")
