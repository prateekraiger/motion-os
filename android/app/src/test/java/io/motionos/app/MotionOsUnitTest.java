package io.motionos.app;

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

    /** Typical launcher footprints, in dips, for a 5 x 4 handset grid. */
    @Test
    public void sizeBucketsMatchPopularWidgetFootprints() {
        assertEquals(MotionWidgetSize.Bucket.MICRO, MotionWidgetSize.pick(57f, 102f));   // 1 x 1
        assertEquals(MotionWidgetSize.Bucket.MICRO, MotionWidgetSize.pick(57f, 220f));   // 1 x 2
        assertEquals(MotionWidgetSize.Bucket.STRIP, MotionWidgetSize.pick(130f, 102f));  // 2 x 1
        assertEquals(MotionWidgetSize.Bucket.STRIP, MotionWidgetSize.pick(276f, 102f));  // 4 x 1
        assertEquals(MotionWidgetSize.Bucket.STRIP, MotionWidgetSize.pick(695f, 117f));  // 5 x 2 landscape
        assertEquals(MotionWidgetSize.Bucket.SMALL, MotionWidgetSize.pick(203f, 220f));  // 2 x 2
        assertEquals(MotionWidgetSize.Bucket.SMALL, MotionWidgetSize.pick(203f, 338f));  // 2 x 3
        assertEquals(MotionWidgetSize.Bucket.WIDE, MotionWidgetSize.pick(276f, 220f));   // 4 x 2
        assertEquals(MotionWidgetSize.Bucket.WIDE, MotionWidgetSize.pick(695f, 249f));   // 5 x 4 landscape
        assertEquals(MotionWidgetSize.Bucket.LARGE, MotionWidgetSize.pick(276f, 338f));  // 3 x 3
        assertEquals(MotionWidgetSize.Bucket.LARGE, MotionWidgetSize.pick(276f, 456f));  // 4 x 4
        assertEquals(MotionWidgetSize.Bucket.LARGE, MotionWidgetSize.pick(349f, 456f));  // 5 x 4
    }

    @Test
    public void sizeBucketsFallBackToTheSmallestLayoutWhenNothingFits() {
        assertEquals(MotionWidgetSize.Bucket.MICRO, MotionWidgetSize.pick(10f, 10f));
    }

    @Test
    public void missingWidgetOptionsFallBackToTheDefaultFootprint() {
        assertEquals(
                MotionWidgetSize.Bucket.WIDE,
                MotionWidgetSize.fromOptions(null, MotionWidgetSize.Bucket.WIDE));
    }
}
