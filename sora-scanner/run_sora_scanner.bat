import os
import re
import time
import requests
import praw
import schedule
import subprocess

# CONFIG
REDDIT_CLIENT_ID = "y3iz5Dw8ugSJ_4oLFlF1gw"
REDDIT_CLIENT_SECRET = "jv2T1pxybLU3qOjMvpkDWdliIyJS3w"
REDDIT_USER_AGENT = "Sora-Scanner by u/Dependent-Wash-4262"

DISCORD_WEBHOOK_URL = "YOUR_DISCORD_WEBHOOK_HERE"  # <--- paste your webhook
SUBREDDIT = "all"
SEARCH_QUERY = "Sora invite code"
POST_LIMIT = 10
CODES_FILE = "codes.txt"
TWITTER_MAX_RESULTS = 5

# REDDIT
reddit = praw.Reddit(
    client_id=REDDIT_CLIENT_ID,
    client_secret=REDDIT_CLIENT_SECRET,
    user_agent=REDDIT_USER_AGENT
)

# HELPERS
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
    for code in codes:
        payload = {"content": f"New Sora code found: {code}"}
        try:
            requests.post(DISCORD_WEBHOOK_URL, json=payload)
        except Exception as e:
            print(f"[Discord Error] {e}")

# REDDIT SCRAPER
def check_reddit():
    print("Checking Reddit...")
    existing_codes = load_existing_codes()
    new_codes = set()
    try:
        for submission in reddit.subreddit(SUBREDDIT).search(SEARCH_QUERY, limit=POST_LIMIT):
            for content in [submission.title, submission.selftext]:
                codes = extract_codes_from_text(content)
                for code in codes:
                    if code not in existing_codes:
                        new_codes.add(code)
    except Exception as e:
        print(f"[Reddit Error] {e}")
    if new_codes:
        print(f"Reddit found {len(new_codes)} new code(s): {new_codes}")
        save_new_codes(new_codes)
        send_to_discord(new_codes)
    else:
        print("Reddit: No new codes.")

# TWITTER SCRAPER via CLI (Python 3.11 safe)
def check_twitter():
    print("Checking Twitter...")
    existing_codes = load_existing_codes()
    new_codes = set()
    try:
        cmd = f"snscrape twitter-search '{SEARCH_QUERY}' --max-results {TWITTER_MAX_RESULTS}"
        result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        tweets = result.stdout.splitlines()
        for tweet in tweets:
            codes = extract_codes_from_text(tweet)
            for code in codes:
                if code not in existing_codes:
                    new_codes.add(code)
    except Exception as e:
        print(f"[Twitter Error] {e}")
    if new_codes:
        print(f"Twitter found {len(new_codes)} new code(s): {new_codes}")
        save_new_codes(new_codes)
        send_to_discord(new_codes)
    else:
        print("Twitter: No new codes.")

# SCHEDULE
schedule.every(1).hours.do(check_reddit)
schedule.every(1).hours.do(check_twitter)

# MAIN
if __name__ == "__main__":
    print("Sora Scanner started. Checking every hour...")
    check_reddit()
    check_twitter()
    while True:
        schedule.run_pending()
        time.sleep(60)
