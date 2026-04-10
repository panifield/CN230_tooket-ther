-- Q1: ดูที่นั่งว่างทั้งหมดใน concert ที่เลือก
SELECT s.seat_id, s.seat_number, s.status, z.zone_name, z.price
FROM seats s
JOIN zones z ON s.zone_id = z.zone_id
WHERE z.concert_id = %(concert_id)s
  AND s.status = 'available'
  AND z.is_active = TRUE
ORDER BY s.seat_number;

-- Q2: ยอดรายรับแยกโซน
SELECT z.zone_name,
       COUNT(p.payment_id) AS tickets_sold,
       SUM(p.amount) AS total_revenue
FROM payments p
JOIN bookings b ON p.booking_id = b.booking_id
JOIN seats s ON b.seat_id = s.seat_id
JOIN zones z ON s.zone_id = z.zone_id
WHERE p.status = 'paid'
  AND z.concert_id = %(concert_id)s
GROUP BY z.zone_name
ORDER BY total_revenue DESC;

-- Q3: ประวัติการซื้อของผู้ใช้
SELECT b.booking_id,
       c.title AS concert_name,
       z.zone_name,
       s.seat_number,
       p.amount,
       p.status,
       b.booked_at
FROM bookings b
JOIN seats s ON b.seat_id = s.seat_id
JOIN zones z ON s.zone_id = z.zone_id
JOIN concerts c ON z.concert_id = c.concert_id
JOIN payments p ON p.booking_id = b.booking_id
WHERE b.user_id = %(user_id)s
ORDER BY b.booked_at DESC;

-- Q4: booking ที่หมดเวลาและยังไม่ชำระ
SELECT b.booking_id, b.user_id, b.seat_id, b.expiry_time
FROM bookings b
WHERE b.status = 'pending'
  AND b.expiry_time < NOW();

-- Q5: โซนที่มี confirmed booking ต่ำกว่า threshold
SELECT z.zone_id, z.zone_name, z.threshold,
       COUNT(b.booking_id) AS confirmed_bookings
FROM zones z
LEFT JOIN seats s ON s.zone_id = z.zone_id
LEFT JOIN bookings b ON b.seat_id = s.seat_id
                    AND b.status = 'confirmed'
WHERE z.concert_id = %(concert_id)s
  AND z.is_active = TRUE
GROUP BY z.zone_id, z.zone_name, z.threshold
HAVING COUNT(b.booking_id) < z.threshold;
