"""
Trading Bot Scheduler
Automatically starts and stops the bot based on market hours
"""

import schedule
import time
from datetime import datetime, time as dt_time
import pytz
from threading import Thread
import requests

class BotScheduler:
    def __init__(self, api_url="http://localhost:5000"):
        """Initialize the scheduler"""
        self.api_url = api_url
        self.running = False
        self.bot_active = False
        
        # Market hours in ET (Eastern Time)
        self.market_open = dt_time(9, 30)  # 9:30 AM ET
        self.market_close = dt_time(16, 0)  # 4:00 PM ET
        
        # Start 1 hour before, stop 1 hour after
        self.bot_start_time = dt_time(8, 30)  # 8:30 AM ET
        self.bot_stop_time = dt_time(17, 0)   # 5:00 PM ET
        
        self.et_timezone = pytz.timezone('America/New_York')
        
        print("📅 Bot Scheduler initialized")
        print(f"   Bot starts: {self.bot_start_time.strftime('%I:%M %p')} ET")
        print(f"   Bot stops: {self.bot_stop_time.strftime('%I:%M %p')} ET")
    
    def is_weekday(self):
        """Check if today is a weekday (Mon-Fri)"""
        now = datetime.now(self.et_timezone)
        return now.weekday() < 5  # 0-4 is Mon-Fri
    
    def is_market_holiday(self):
        """Check if today is a market holiday"""
        # US market holidays for 2026 (approximate - you'd want to use a proper API)
        holidays = [
            datetime(2026, 1, 1),   # New Year's Day
            datetime(2026, 1, 19),  # MLK Day
            datetime(2026, 2, 16),  # Presidents Day
            datetime(2026, 4, 10),  # Good Friday
            datetime(2026, 5, 25),  # Memorial Day
            datetime(2026, 7, 3),   # Independence Day (observed)
            datetime(2026, 9, 7),   # Labor Day
            datetime(2026, 11, 26), # Thanksgiving
            datetime(2026, 12, 25), # Christmas
        ]
        
        now = datetime.now(self.et_timezone)
        today = now.date()
        
        for holiday in holidays:
            if holiday.date() == today:
                return True
        return False
    
    def should_bot_run(self):
        """Check if bot should be running now"""
        if not self.is_weekday():
            return False
        
        if self.is_market_holiday():
            return False
        
        now = datetime.now(self.et_timezone).time()
        
        # Bot should run between start and stop time
        return self.bot_start_time <= now < self.bot_stop_time
    
    def start_bot(self):
        """Start the trading bot via API"""
        if self.bot_active:
            print("⚠️  Bot is already running")
            return
        
        if not self.should_bot_run():
            print("⚠️  Not the right time to start bot (weekend/holiday/outside hours)")
            return
        
        try:
            response = requests.post(f"{self.api_url}/api/bot/start", timeout=5)
            if response.status_code == 200:
                self.bot_active = True
                now = datetime.now(self.et_timezone).strftime('%I:%M %p ET')
                print(f"✅ Bot started automatically at {now}")
            else:
                print(f"❌ Failed to start bot: {response.json().get('error', 'Unknown error')}")
        except Exception as e:
            print(f"❌ Error starting bot: {e}")
    
    def stop_bot(self):
        """Stop the trading bot via API"""
        if not self.bot_active:
            print("⚠️  Bot is not running")
            return
        
        try:
            response = requests.post(f"{self.api_url}/api/bot/stop", timeout=5)
            if response.status_code == 200:
                self.bot_active = False
                now = datetime.now(self.et_timezone).strftime('%I:%M %p ET')
                print(f"✅ Bot stopped automatically at {now}")
            else:
                print(f"❌ Failed to stop bot: {response.json().get('error', 'Unknown error')}")
        except Exception as e:
            print(f"❌ Error stopping bot: {e}")
    
    def check_and_start(self):
        """Check if bot should start and start it"""
        if self.should_bot_run() and not self.bot_active:
            print(f"\n{'='*60}")
            print(f"⏰ Scheduled start time reached")
            print(f"{'='*60}")
            self.start_bot()
    
    def check_and_stop(self):
        """Check if bot should stop and stop it"""
        if not self.should_bot_run() and self.bot_active:
            print(f"\n{'='*60}")
            print(f"⏰ Scheduled stop time reached")
            print(f"{'='*60}")
            self.stop_bot()
    
    def status_check(self):
        """Periodic status check"""
        now = datetime.now(self.et_timezone)
        current_time = now.strftime('%I:%M %p ET')
        
        if now.minute == 0:  # Print status every hour
            print(f"\n⏰ Status check at {current_time}")
            print(f"   Bot active: {'Yes' if self.bot_active else 'No'}")
            print(f"   Weekday: {'Yes' if self.is_weekday() else 'No'}")
            print(f"   Should run: {'Yes' if self.should_bot_run() else 'No'}")
    
    def run(self):
        """Run the scheduler"""
        self.running = True
        
        # Schedule the start time (8:30 AM ET every weekday)
        schedule.every().monday.at("08:30").do(self.check_and_start)
        schedule.every().tuesday.at("08:30").do(self.check_and_start)
        schedule.every().wednesday.at("08:30").do(self.check_and_start)
        schedule.every().thursday.at("08:30").do(self.check_and_start)
        schedule.every().friday.at("08:30").do(self.check_and_start)
        
        # Schedule the stop time (5:00 PM ET every weekday)
        schedule.every().monday.at("17:00").do(self.check_and_stop)
        schedule.every().tuesday.at("17:00").do(self.check_and_stop)
        schedule.every().wednesday.at("17:00").do(self.check_and_stop)
        schedule.every().thursday.at("17:00").do(self.check_and_stop)
        schedule.every().friday.at("17:00").do(self.check_and_stop)
        
        # Status check every 10 minutes
        schedule.every(10).minutes.do(self.status_check)
        
        print("\n" + "="*60)
        print("📅 SCHEDULER STARTED")
        print("="*60)
        print(f"Current time: {datetime.now(self.et_timezone).strftime('%I:%M %p ET on %A, %B %d, %Y')}")
        print(f"Bot will start: 8:30 AM ET (Mon-Fri)")
        print(f"Bot will stop: 5:00 PM ET (Mon-Fri)")
        print("="*60 + "\n")
        
        # Check immediately if we should start
        if self.should_bot_run():
            print("🚀 Within trading hours - starting bot now...")
            self.start_bot()
        else:
            now = datetime.now(self.et_timezone)
            if now.weekday() >= 5:
                print("📅 It's the weekend - bot will start Monday at 8:30 AM ET")
            else:
                print("⏰ Outside trading hours - waiting for next scheduled start")
        
        # Run scheduler loop
        while self.running:
            schedule.run_pending()
            time.sleep(30)  # Check every 30 seconds
    
    def stop(self):
        """Stop the scheduler"""
        self.running = False
        if self.bot_active:
            self.stop_bot()
        print("\n📅 Scheduler stopped")


def main():
    """Main entry point for scheduler"""
    print("\n" + "="*60)
    print("📅 TRADING BOT SCHEDULER")
    print("="*60)
    print("Automatically starts bot 1 hour before market open")
    print("Automatically stops bot 1 hour after market close")
    print("Respects weekends and US market holidays")
    print("="*60 + "\n")
    
    scheduler = BotScheduler()
    
    try:
        scheduler.run()
    except KeyboardInterrupt:
        print("\n\n⚠️  Scheduler interrupted by user")
        scheduler.stop()


if __name__ == '__main__':
    main()
