package com.motionos.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import java.util.Calendar;
import org.junit.Test;

/** Small host-side checks for the calendar arithmetic used by native widgets. */
public class MotionOsUnitTest {

    @Test
    public void ageAtReturnsCalendarAccurateBreakdown() {
        Calendar birth = Calendar.getInstance();
        birth.clear();
        birth.set(2000, Calendar.JANUARY, 1, 10, 30, 0);
        long now = birth.getTimeInMillis();
        birth.add(Calendar.YEAR, 25);
        birth.add(Calendar.MONTH, 2);
        birth.add(Calendar.DAY_OF_MONTH, 3);
        birth.add(Calendar.HOUR_OF_DAY, 4);
        birth.add(Calendar.MINUTE, 5);
        birth.add(Calendar.SECOND, 6);

        MotionWidgetData.AgeParts age = MotionWidgetData.ageAt(now, birth.getTimeInMillis());

        assertNotNull(age);
        assertEquals(25, age.years);
        assertEquals(2, age.months);
        assertEquals(3, age.days);
        assertEquals(4, age.hours);
        assertEquals(5, age.minutes);
        assertEquals(6, age.seconds);
    }

    @Test
    public void ageAtRejectsMissingOrFutureBirthMoments() {
        long now = System.currentTimeMillis();

        assertNull(MotionWidgetData.ageAt(0L, now));
        assertNull(MotionWidgetData.ageAt(now + 1_000L, now));
    }
}
