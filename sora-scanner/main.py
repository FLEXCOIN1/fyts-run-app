# main.py
import praw
import requests
import re
import schedule
import time
import os

# CONFIG
REDDIT_CLIENT_ID = "y3iz5Dw8ugSJ_4oLFlF1gw"
REDDIT_CLIENT_SECRET = "jv2T1pxybLU3qOjMvpkDWdliIyJS3w"
REDDIT_USER_AGENT = "Sora-Scanner by u/Dependent-Wash-4262"

SUBREDDIT = "all"
SEARCH_QUERY = "Sora invite code"
POST_LIMIT = 10
CODES_FILE = "codes.txt"
DISCORD_WEBHOOK_URL = "PASTE_YOUR_WEBHOOK_URL_HERE"

# Reddit setup
reddit = praw.Reddit(
    client_id=REDDIT_CLIENT_ID,
    client_secret=REDDIT_CLIENT_SECRET,
    user_agent=REDDIT_USER_AGENT
)

# Functions
def load_existing_codes():
    if not os.path.exists(CODES_FILE):
        return set()
    with open(CODES_FILE, "r") as f:
        return set(line.strip() for line in f.readlines())

def save_new_codes(new_codes):
    if not new_codes:
        return
    with open(CODES_FILE, "a") as f:
        for code in new_codes:
            f.write(code + "\n")

def extract_codes_from_text(text):
    return re.findall(r"\b[A-Za-z0-9_]{8,16}\b", text)

def send_to_discord(codes):
    if not codes:
        return
    content = "\n".join(codes)
    payload = {"content": f"New Sora codes found:\n{content}"}
    try:
        requests.post(DISCORD_WEBHOOK_URL, json=payload)
        print(f"Sent {len(codes)} new code(s) to Discord!")
    except Exception as e:
        print(f"[ERROR] Could not send to Discord: {e}")

def check_reddit():
    print("Checking Reddit for new Sora invite codes...")
    existing_codes = load_existing_codes()
    new_codes = set()

    try:
        for submission in reddit.subreddit(SUBREDDIT).search(SEARCH_QUERY, limit=POST_LIMIT):
            for content in [submission.title, submission.selftext]:
                codes_found = extract_codes_from_text(content)
                for code in codes_found:
                    if code not in existing_codes:
                        new_codes.add(code)
    except Exception as e:
        print(f"[ERROR] Reddit scraping failed: {e}")

    if new_codes:
        print(f"Found {len(new_codes)} new code(s): {new_codes}")
        save_new_codes(new_codes)
        send_to_discord(new_codes)
    else:
        print("No new codes found.")

# Schedule
schedule.every(1).hours.do(check_reddit)

# Main loop
if __name__ == "__main__":
    print("Sora Scanner started. Checking every hour...")
    check_reddit()
    while True:
        schedule.run_pending()
        time.sleep(60)
