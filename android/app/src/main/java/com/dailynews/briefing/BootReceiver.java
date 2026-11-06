package com.dailynews.briefing;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Alarms are cleared on restart or app update, so set the daily reminder again. */
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent intent) { Reminder.schedule(c); }
}
