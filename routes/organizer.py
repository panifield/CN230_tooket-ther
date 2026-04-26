"""
routes/organizer.py — Organizer Endpoints
------------------------------------------
GET    /organizer/concerts/{concert_id}/queues  ดูรายชื่อคิวสำหรับส่ง Admit
POST   /organizer/queues/{queue_id}/admit       เปลี่ยนสถานะคิวลูกค้าเป็น admitted
PATCH  /organizer/queues/{queue_id}/priority    แก้ไขคะแนน priority (location_score)
"""
import os
import logging
import json
import shutil
import uuid
from datetime import datetime
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, BackgroundTasks, HTTPException, status, File, UploadFile, Form
from pydantic import BaseModel

from models import get_db_connection
from routes.deps import CurrentUser

logger = logging.getLogger("tooket-ther")

organizer_router = APIRouter(prefix="/organizer", tags=["organizer"])


def _check_organizer_role(current_user: CurrentUser):
    if current_user.get("role") != "organizer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="เฉพาะ Organizer เท่านั้น",
        )


@organizer_router.get("/concerts/{concert_id}/queues")
def get_concert_queues(concert_id: int, current_user: CurrentUser):
    """
    ดึงรายชื่อลูกค้าที่อยู่ในคิวสำหรับคอนเสิร์ตนี้ทั้งหมด
    จัดเรียงตามลำดับ Priority และเวลาการเข้าคิว
    """
    _check_organizer_role(current_user)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT q.id, u.name, u.email, q.priority_score, q.status, q.entered_at
                FROM queue_session q
                JOIN customer_profile cp ON q.customer_id = cp.id
                JOIN users u ON cp.user_id = u.id
                WHERE q.concert_id = %s
                ORDER BY q.priority_score DESC, q.entered_at ASC
                """,
                (concert_id,)
            )
            rows = cur.fetchall()

    return [
        {
            "queue_id": r[0],
            "customer_name": r[1],
            "customer_email": r[2],
            "priority_score": r[3],
            "status": r[4],
            "entered_at": r[5].isoformat() if r[5] else None
        }
        for r in rows
    ]


@organizer_router.post("/queues/{queue_id}/admit")
def admit_customer_queue(queue_id: int, current_user: CurrentUser):
    """
    Organizer เปลี่ยนสถานะคิวจาก waiting เป็น admitted
    """
    _check_organizer_role(current_user)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE queue_session
                SET status = 'admitted', admitted_at = NOW()
                WHERE id = %s AND status = 'waiting'
                RETURNING id
                """,
                (queue_id,)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="แอดมิทไม่ได้ คิวนี้อาจจะไม่ได้อยู่ในสถานะ waiting หรือคิวไม่มีอยู่จริง"
                )
        conn.commit()

    return {"message": f"Admit คิวหมายเลข {queue_id} สำเร็จแล้ว"}


class UpdatePriorityBody(BaseModel):
    priority_score: int


@organizer_router.patch("/queues/{queue_id}/priority")
def update_queue_priority(queue_id: int, body: UpdatePriorityBody, current_user: CurrentUser):
    """
    Organizer จัดการแก้ไขตัวเลข priority_score ให้ลูกค้าโดยตรง
    """
    _check_organizer_role(current_user)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE queue_session
                SET priority_score = %s
                WHERE id = %s
                RETURNING id
                """,
                (body.priority_score, queue_id)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="ไม่พบคิวที่ต้องการแก้ไข"
                )
        conn.commit()

    return {"message": f"อัปเดต Priority ของคิวที่ {queue_id} เป็น {body.priority_score} สำเร็จ"}

from datetime import datetime
from typing import List


class ZoneInput(BaseModel):
    zone_name: str
    total_seats: int
    price: Decimal
    row_prefix: str = "A"

    @property
    def validate_fields(self):
        if self.total_seats <= 0:
            raise ValueError("total_seats ต้องมากกว่า 0")
        if self.price < 0:
            raise ValueError("price ต้องไม่ติดลบ")


class CreateConcertBody(BaseModel):
    title: str
    artist: str
    venue: str
    address: str
    concert_datetime: datetime
    sale_open_at: datetime
    sale_close_at: datetime = None
    status: str = "on_sale"
    zones: List[ZoneInput] = []


@organizer_router.post("/concerts", status_code=status.HTTP_201_CREATED)
def create_concert(
    current_user: CurrentUser,
    title: str = Form(...),
    artist: str = Form(...),
    venue: str = Form(...),
    address: str = Form(...),
    concert_datetime: str = Form(...),
    sale_open_at: str = Form(...),
    sale_close_at: Optional[str] = Form(None),
    status: str = Form("on_sale"),
    zones_json: str = Form("[]"),
    image: Optional[UploadFile] = File(None)
):
    """
    Organizer สร้างคอนเสิร์ตใหม่ พร้อม zone และ seat + อัปโหลดรูปภาพ
    """
    _check_organizer_role(current_user)
    organizer_profile_id = current_user.get("organizer_profile_id")
    if not organizer_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบข้อมูล organizer profile ของคุณ")

    # Parse zones
    try:
        zones_data = json.loads(zones_json)
        zones = [ZoneInput(**z) for z in zones_data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"รูปแบบ zones ไม่ถูกต้อง: {str(e)}")

    # Handle image upload
    image_url = None
    if image:
        # ตรวจสอบนามสกุลไฟล์
        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            raise HTTPException(status_code=400, detail="อนุญาตเฉพาะไฟล์รูปภาพ (.jpg, .png, .webp)")
        
        # สร้างโฟลเดอร์ถ้าไม่มี
        os.makedirs("database/image", exist_ok=True)
        
        # ตั้งชื่อไฟล์ใหม่เพื่อกันชื่อซ้ำ
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join("database/image", filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        
        image_url = f"database/image/{filename}"

    # ตรวจสอบ zone ก่อน hit DB
    seen_names = set()
    for z in zones:
        if z.total_seats <= 0:
            raise HTTPException(
                status_code=422,
                detail=f"Zone '{z.zone_name}': total_seats ต้องมากกว่า 0",
            )
        if z.price < 0:
            raise HTTPException(
                status_code=422,
                detail=f"Zone '{z.zone_name}': price ต้องไม่ติดลบ",
            )
        if z.zone_name in seen_names:
            raise HTTPException(
                status_code=422,
                detail=f"ชื่อ zone '{z.zone_name}' ซ้ำกัน",
            )
        seen_names.add(z.zone_name)

    with get_db_connection() as conn:
        try:
            with conn.cursor() as cur:
                from models import fix_all_sequences
                fix_all_sequences(cur)

                # 1) สร้าง concert
                cur.execute(
                    """
                    INSERT INTO concert
                      (organizer_id, title, artist, venue, address,
                       concert_datetime, sale_open_at, sale_close_at, status, image_url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        organizer_profile_id, title, artist,
                        venue, address, concert_datetime,
                        sale_open_at, sale_close_at, status, image_url
                    ),
                )
                concert_id = cur.fetchone()[0]

                # 2) สร้าง zone + seat (ถ้ามี)
                zones_created = []
                for z in zones:
                    cur.execute(
                        """
                        INSERT INTO zone
                          (concert_id, zone_name, total_seats, price, is_active)
                        VALUES (%s, %s, %s, %s, TRUE)
                        RETURNING id
                        """,
                        (concert_id, z.zone_name, z.total_seats, z.price),
                    )
                    zone_id = cur.fetchone()[0]

                    # สร้าง seat ทีละแถวตามจำนวน total_seats
                    if z.total_seats > 0:
                        # สร้าง seat_number เช่น A1, A2, ... ตาม row_prefix
                        prefix = z.row_prefix if z.row_prefix else "A"
                        seat_rows = [
                            (zone_id, f"{prefix}{i+1}", prefix, "available")
                            for i in range(z.total_seats)
                        ]
                        cur.executemany(
                            "INSERT INTO seat (zone_id, seat_number, seat_row, status) VALUES (%s, %s, %s, %s)",
                            seat_rows,
                        )

                    zones_created.append({
                        "zone_id": zone_id,
                        "zone_name": z.zone_name,
                        "total_seats": z.total_seats,
                        "price": float(z.price),
                    })

            conn.commit()

        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:
            conn.rollback()
            logger.exception("create_concert error: %s", exc)
            raise HTTPException(status_code=500, detail=f"สร้างคอนเสิร์ตไม่สำเร็จ: {exc}")

    logger.info(
        "Concert created: concert_id=%s organizer=%s zones=%d",
        concert_id, organizer_profile_id, len(zones_created),
    )

    return {
        "message": "สร้างคอนเสิร์ตสำเร็จ",
        "concert_id": concert_id,
        "zones": zones_created,
    }


@organizer_router.delete("/concerts/{concert_id}")
def delete_concert(concert_id: int, current_user: CurrentUser):
    """
    Soft-delete คอนเสิร์ต: UPDATE concert SET status = 'cancelled'.
    เก็บประวัติ booking, payment, refund, finance, queue_session ไว้ครบเพื่อ
    audit trail (ห้าม hard delete). organizer ของคอนเสิร์ตเองเท่านั้นที่ทำได้.
    """
    _check_organizer_role(current_user)
    organizer_profile_id = current_user.get("organizer_profile_id")
    if not organizer_profile_id:
        raise HTTPException(status_code=403, detail="ไม่พบ organizer profile")

    with get_db_connection() as conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT organizer_id, status FROM concert WHERE id = %s FOR UPDATE",
                    (concert_id,),
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="ไม่พบคอนเสิร์ต")

                owner_id, current_status = row
                if owner_id != organizer_profile_id:
                    raise HTTPException(
                        status_code=403,
                        detail="ไม่ใช่ organizer ของคอนเสิร์ตนี้",
                    )
                if current_status == "cancelled":
                    raise HTTPException(
                        status_code=409,
                        detail="คอนเสิร์ตนี้ถูกยกเลิกไปแล้ว",
                    )

                cur.execute(
                    "UPDATE concert SET status = 'cancelled' WHERE id = %s",
                    (concert_id,),
                )

            conn.commit()
            logger.info(
                "Concert cancelled: concert_id=%s organizer=%s prev_status=%s",
                concert_id, organizer_profile_id, current_status,
            )

        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:
            conn.rollback()
            logger.exception("delete_concert error: %s", exc)
            raise HTTPException(status_code=500, detail=f"ยกเลิกคอนเสิร์ตไม่สำเร็จ: {exc}")

    return {
        "message": "ยกเลิกคอนเสิร์ตสำเร็จ",
        "concert_id": concert_id,
        "status": "cancelled",
    }


@organizer_router.get("/concerts/{concert_id}")
def get_concert_for_edit(concert_id: int, current_user: CurrentUser):
    """
    Detailed concert payload สำหรับฟอร์มแก้ไข (รวม sale_open_at/sale_close_at + zones)
    organizer ของคอนเสิร์ตนี้เท่านั้นที่อ่านได้
    """
    _check_organizer_role(current_user)
    organizer_profile_id = current_user.get("organizer_profile_id")
    if not organizer_profile_id:
        raise HTTPException(status_code=403, detail="ไม่พบ organizer profile")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, organizer_id, title, artist, venue, address,
                       concert_datetime, sale_open_at, sale_close_at, status, image_url
                FROM concert WHERE id = %s
                """,
                (concert_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="ไม่พบคอนเสิร์ต")

            (c_id, owner_id, title, artist, venue, address,
             concert_dt, sale_open, sale_close, status_v, image_url) = row

            if owner_id != organizer_profile_id:
                raise HTTPException(
                    status_code=403,
                    detail="ไม่ใช่ organizer ของคอนเสิร์ตนี้",
                )

            cur.execute(
                """
                SELECT z.id, z.zone_name, z.total_seats, z.price,
                       (SELECT seat_row FROM seat
                        WHERE zone_id = z.id ORDER BY id LIMIT 1) AS row_prefix
                FROM zone z
                WHERE z.concert_id = %s
                ORDER BY z.id
                """,
                (concert_id,),
            )
            zones = [
                {
                    "zone_id": zr[0],
                    "zone_name": zr[1],
                    "total_seats": zr[2],
                    "price": float(zr[3]),
                    "row_prefix": zr[4] or "A",
                }
                for zr in cur.fetchall()
            ]

    def _iso(dt):
        return dt.isoformat() if dt else None

    return {
        "concert_id": c_id,
        "title": title,
        "artist": artist,
        "venue": venue,
        "address": address,
        "concert_datetime": _iso(concert_dt),
        "sale_open_at": _iso(sale_open),
        "sale_close_at": _iso(sale_close),
        "status": status_v,
        "image_url": image_url,
        "zones": zones,
    }


@organizer_router.patch("/concerts/{concert_id}")
def update_concert(
    concert_id: int,
    current_user: CurrentUser,
    title: str = Form(...),
    artist: str = Form(...),
    venue: str = Form(...),
    address: str = Form(...),
    concert_datetime: str = Form(...),
    sale_open_at: str = Form(...),
    sale_close_at: Optional[str] = Form(None),
    zones_json: str = Form("[]"),
    image: Optional[UploadFile] = File(None),
):
    """
    อัปเดตคอนเสิร์ต + zones ตาม business rules:
    - status ถูกตรึงไว้ (ใช้ DELETE endpoint สำหรับ cancel)
    - zone ที่ไม่อยู่ใน payload → ลบได้เฉพาะเมื่อไม่มี ticket อ้างอิง seat ของ zone นั้น
    - ลด total_seats ห้ามทำถ้า zone มี ticket อยู่; เพิ่ม total_seats ต่อเลข seat เดิม
    - ราคา/ชื่อ zone เปลี่ยนได้เสมอ
    - image: ไม่ส่งมา = คงรูปเดิม; ส่งมา = บันทึกใหม่และอัปเดต URL (ปล่อยรูปเก่าค้างไว้)
    """
    _check_organizer_role(current_user)
    organizer_profile_id = current_user.get("organizer_profile_id")
    if not organizer_profile_id:
        raise HTTPException(status_code=403, detail="ไม่พบ organizer profile")

    try:
        payload_zones = json.loads(zones_json)
        if not isinstance(payload_zones, list):
            raise ValueError("zones_json ต้องเป็น array")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"รูปแบบ zones ไม่ถูกต้อง: {e}")

    seen_names: set = set()
    parsed_zones = []
    for raw in payload_zones:
        if not isinstance(raw, dict):
            raise HTTPException(status_code=422, detail="zone item ต้องเป็น object")
        zone_name = (raw.get("zone_name") or "").strip()
        if not zone_name:
            raise HTTPException(status_code=422, detail="zone_name ห้ามว่าง")
        if zone_name in seen_names:
            raise HTTPException(
                status_code=422,
                detail=f"ชื่อ zone '{zone_name}' ซ้ำกัน",
            )
        seen_names.add(zone_name)

        try:
            total_seats = int(raw.get("total_seats", 0))
            price = Decimal(str(raw.get("price", 0)))
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=422,
                detail=f"Zone '{zone_name}': total_seats/price ไม่ถูกต้อง",
            )
        if total_seats <= 0:
            raise HTTPException(
                status_code=422,
                detail=f"Zone '{zone_name}': total_seats ต้องมากกว่า 0",
            )
        if price < 0:
            raise HTTPException(
                status_code=422,
                detail=f"Zone '{zone_name}': price ต้องไม่ติดลบ",
            )

        zone_id = raw.get("zone_id")
        if zone_id is not None:
            try:
                zone_id = int(zone_id)
            except (TypeError, ValueError):
                raise HTTPException(
                    status_code=422,
                    detail=f"Zone '{zone_name}': zone_id ไม่ใช่จำนวนเต็ม",
                )

        row_prefix = (raw.get("row_prefix") or "A").strip() or "A"

        parsed_zones.append({
            "zone_id": zone_id,
            "zone_name": zone_name,
            "total_seats": total_seats,
            "price": price,
            "row_prefix": row_prefix,
        })

    image_url_new: Optional[str] = None
    if image is not None and image.filename:
        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
            raise HTTPException(
                status_code=400,
                detail="อนุญาตเฉพาะไฟล์รูปภาพ (.jpg, .png, .webp)",
            )
        os.makedirs("database/image", exist_ok=True)
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join("database/image", filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url_new = f"database/image/{filename}"

    with get_db_connection() as conn:
        try:
            with conn.cursor() as cur:
                from models import fix_all_sequences
                fix_all_sequences(cur)

                cur.execute(
                    """
                    SELECT organizer_id FROM concert WHERE id = %s FOR UPDATE
                    """,
                    (concert_id,),
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="ไม่พบคอนเสิร์ต")
                if row[0] != organizer_profile_id:
                    raise HTTPException(
                        status_code=403,
                        detail="ไม่ใช่ organizer ของคอนเสิร์ตนี้",
                    )

                cur.execute(
                    """
                    SELECT id, zone_name, total_seats
                    FROM zone WHERE concert_id = %s FOR UPDATE
                    """,
                    (concert_id,),
                )
                existing_zones = {r[0]: {"zone_name": r[1], "total_seats": r[2]} for r in cur.fetchall()}

                payload_ids = {z["zone_id"] for z in parsed_zones if z["zone_id"] is not None}

                unknown_ids = payload_ids - set(existing_zones.keys())
                if unknown_ids:
                    raise HTTPException(
                        status_code=422,
                        detail=f"zone_id {sorted(unknown_ids)} ไม่ใช่ของคอนเสิร์ตนี้",
                    )

                ids_to_delete = set(existing_zones.keys()) - payload_ids
                for zid in ids_to_delete:
                    cur.execute(
                        """
                        SELECT 1 FROM ticket t
                        JOIN seat s ON s.id = t.seat_id
                        WHERE s.zone_id = %s LIMIT 1
                        """,
                        (zid,),
                    )
                    if cur.fetchone():
                        raise HTTPException(
                            status_code=409,
                            detail=(
                                f"ลบ zone '{existing_zones[zid]['zone_name']}' ไม่ได้ "
                                "เพราะมีตั๋วอ้างอิงอยู่ — ใช้ฟีเจอร์ Close Zone แทน"
                            ),
                        )
                    cur.execute("DELETE FROM seat WHERE zone_id = %s", (zid,))
                    cur.execute("DELETE FROM zone WHERE id = %s", (zid,))

                for z in parsed_zones:
                    if z["zone_id"] is not None:
                        zid = z["zone_id"]
                        existing = existing_zones[zid]
                        new_total = z["total_seats"]
                        old_total = existing["total_seats"]

                        cur.execute(
                            """
                            UPDATE zone
                            SET zone_name = %s, price = %s, total_seats = %s
                            WHERE id = %s
                            """,
                            (z["zone_name"], z["price"], new_total, zid),
                        )

                        if new_total > old_total:
                            cur.execute(
                                "SELECT seat_row FROM seat WHERE zone_id = %s ORDER BY id LIMIT 1",
                                (zid,),
                            )
                            row_seat = cur.fetchone()
                            prefix = (row_seat[0] if row_seat and row_seat[0] else z["row_prefix"]) or "A"

                            cur.execute(
                                "SELECT COUNT(*) FROM seat WHERE zone_id = %s",
                                (zid,),
                            )
                            current_count = cur.fetchone()[0] or 0

                            additions = [
                                (zid, f"{prefix}{current_count + i + 1}", prefix, "available")
                                for i in range(new_total - old_total)
                            ]
                            cur.executemany(
                                "INSERT INTO seat (zone_id, seat_number, seat_row, status) "
                                "VALUES (%s, %s, %s, %s)",
                                additions,
                            )
                        elif new_total < old_total:
                            cur.execute(
                                """
                                SELECT 1 FROM ticket t
                                JOIN seat s ON s.id = t.seat_id
                                WHERE s.zone_id = %s LIMIT 1
                                """,
                                (zid,),
                            )
                            if cur.fetchone():
                                raise HTTPException(
                                    status_code=409,
                                    detail=(
                                        f"ลด total_seats ของ zone '{z['zone_name']}' ไม่ได้ "
                                        "เพราะมีตั๋วอ้างอิงอยู่"
                                    ),
                                )
                            to_remove = old_total - new_total
                            cur.execute(
                                """
                                DELETE FROM seat
                                WHERE id IN (
                                    SELECT id FROM seat WHERE zone_id = %s
                                    ORDER BY id DESC LIMIT %s
                                )
                                """,
                                (zid, to_remove),
                            )
                    else:
                        cur.execute(
                            """
                            INSERT INTO zone (concert_id, zone_name, total_seats, price, is_active)
                            VALUES (%s, %s, %s, %s, TRUE)
                            RETURNING id
                            """,
                            (concert_id, z["zone_name"], z["total_seats"], z["price"]),
                        )
                        new_zone_id = cur.fetchone()[0]
                        prefix = z["row_prefix"]
                        seat_rows = [
                            (new_zone_id, f"{prefix}{i+1}", prefix, "available")
                            for i in range(z["total_seats"])
                        ]
                        if seat_rows:
                            cur.executemany(
                                "INSERT INTO seat (zone_id, seat_number, seat_row, status) "
                                "VALUES (%s, %s, %s, %s)",
                                seat_rows,
                            )

                if image_url_new is not None:
                    cur.execute(
                        """
                        UPDATE concert
                        SET title = %s, artist = %s, venue = %s, address = %s,
                            concert_datetime = %s, sale_open_at = %s, sale_close_at = %s,
                            image_url = %s
                        WHERE id = %s
                        """,
                        (
                            title, artist, venue, address,
                            concert_datetime, sale_open_at, sale_close_at,
                            image_url_new, concert_id,
                        ),
                    )
                else:
                    cur.execute(
                        """
                        UPDATE concert
                        SET title = %s, artist = %s, venue = %s, address = %s,
                            concert_datetime = %s, sale_open_at = %s, sale_close_at = %s
                        WHERE id = %s
                        """,
                        (
                            title, artist, venue, address,
                            concert_datetime, sale_open_at, sale_close_at,
                            concert_id,
                        ),
                    )

            conn.commit()
            logger.info(
                "Concert updated: concert_id=%s organizer=%s zones=%d image_replaced=%s",
                concert_id, organizer_profile_id, len(parsed_zones),
                bool(image_url_new),
            )

        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:
            conn.rollback()
            logger.exception("update_concert error: %s", exc)
            raise HTTPException(status_code=500, detail=f"อัปเดตคอนเสิร์ตไม่สำเร็จ: {exc}")

    return {
        "message": "อัปเดตคอนเสิร์ตสำเร็จ",
        "concert_id": concert_id,
    }


@organizer_router.post("/concerts/{concert_id}/queues/auto_sort")
def auto_sort_queues(concert_id: int, current_user: CurrentUser):
    """
    Organizer ปรับ priority score ใหม่ โดยดูจาก address ของ Concert vs User
    (ตรงกัน = 100, ไม่ตรง = 10)
    """
    _check_organizer_role(current_user)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # ดึง address ของ concert
            cur.execute("SELECT address FROM concert WHERE id = %s", (concert_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="ไม่พบคอนเสิร์ต")
            c_addr = row[0] or ""
            c_addr_lower = c_addr.strip().lower()

            # ดึง queue ที่กำลังรออยู่
            cur.execute(
                """
                SELECT q.id, u.address 
                FROM queue_session q
                JOIN customer_profile cp ON q.customer_id = cp.id
                JOIN users u ON cp.user_id = u.id
                WHERE q.concert_id = %s AND q.status = 'waiting'
                """, (concert_id,)
            )
            queues = cur.fetchall()

            updated_count = 0
            for q_id, u_addr in queues:
                u_addr_lower = (u_addr or "").strip().lower()
                # ให้คะแนนความสนใจพิเศษตามโซนที่อยู่ (address)
                score = 100 if (c_addr_lower and c_addr_lower in u_addr_lower) else 10
                
                cur.execute(
                    "UPDATE queue_session SET priority_score = %s WHERE id = %s",
                    (score, q_id)
                )
                updated_count += 1

        conn.commit()

    return {"message": f"เรียงคิวอัตโนมัติสำเร็จ (อัปเดตคะแนนใหม่ {updated_count} คิว)"}


# ---------------------------------------------------------------------------
# Zone closure — ปิดโซนเมื่อมีคนซื้อน้อย
# ---------------------------------------------------------------------------

def _mock_send_zone_closed_email(email: str, zone_name: str, concert_title: str, booking_id: int):
    """
    Mock email sender. แทนที่ด้วย SMTP/SES/SendGrid integration ทีหลัง.
    """
    logger.info(
        "[MOCK EMAIL] to=%s | subject='โซน %s ของคอนเสิร์ต %s ถูกปิด' | "
        "booking_id=%s | body='โซนที่คุณจองถูกปิดแล้ว กรุณา login "
        "เข้าระบบเพื่อเลือก 1) ขอคืนเงินเต็มจำนวน หรือ 2) เลือกที่นั่งใหม่ในโซนอื่นฟรี'",
        email, zone_name, concert_title, booking_id,
    )


@organizer_router.post("/zones/{zone_id}/close")
def close_zone(zone_id: int, background_tasks: BackgroundTasks, current_user: CurrentUser):
    """
    Organizer ปิดโซนที่มีคนซื้อน้อย (soft-delete):
    - zone.is_active = FALSE
    - seat ที่ยังไม่ sold → 'closed'
    - booking.status 'paid' ที่มี ticket ในโซนนี้ → 'zone_closed_action_required'
      (ใช้เป็น "voucher" ให้ user เลือก refund หรือ free upgrade)
    - queue email ลูกค้าที่ได้รับผลกระทบ (background task)
    """
    _check_organizer_role(current_user)
    organizer_profile_id = current_user.get("organizer_profile_id")
    if not organizer_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบ organizer profile ของคุณ")

    with get_db_connection() as conn:
        try:
            with conn.cursor() as cur:
                # Lock zone + ตรวจ ownership ผ่าน concert.organizer_id
                cur.execute(
                    """
                    SELECT z.id, z.zone_name, z.is_active, z.concert_id,
                           c.title, c.organizer_id
                    FROM zone z
                    JOIN concert c ON c.id = z.concert_id
                    WHERE z.id = %s
                    FOR UPDATE OF z
                    """,
                    (zone_id,),
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="ไม่พบโซน")

                z_id, zone_name, is_active, concert_id, concert_title, owner_id = row

                if owner_id != organizer_profile_id:
                    raise HTTPException(status_code=403, detail="ไม่ใช่ organizer ของคอนเสิร์ตนี้")
                if not is_active:
                    raise HTTPException(status_code=400, detail="โซนนี้ถูกปิดไปแล้ว")

                # หา booking ที่ได้รับผลกระทบ (paid + มี ticket อยู่ในโซนนี้)
                cur.execute(
                    """
                    SELECT DISTINCT b.id, u.email
                    FROM booking b
                    JOIN ticket t ON t.booking_id = b.id
                    JOIN seat s ON s.id = t.seat_id
                    JOIN customer_profile cp ON cp.id = b.customer_id
                    JOIN users u ON u.id = cp.user_id
                    WHERE s.zone_id = %s AND b.status = 'paid'
                    """,
                    (z_id,),
                )
                affected = cur.fetchall()  # [(booking_id, email), ...]
                affected_booking_ids = [r[0] for r in affected]

                # ปิด zone
                cur.execute(
                    "UPDATE zone SET is_active = FALSE WHERE id = %s",
                    (z_id,),
                )

                # seat ที่ยังไม่ถูก sold → closed (sold เก็บสถานะไว้เป็น audit)
                cur.execute(
                    """
                    UPDATE seat SET status = 'closed'
                    WHERE zone_id = %s AND status IN ('available','locked')
                    """,
                    (z_id,),
                )
                seats_closed = cur.rowcount

                # booking ที่ได้รับผลกระทบ → zone_closed_action_required (voucher)
                if affected_booking_ids:
                    placeholders = ",".join(["%s"] * len(affected_booking_ids))
                    cur.execute(
                        f"""
                        UPDATE booking SET status = 'zone_closed_action_required'
                        WHERE id IN ({placeholders})
                        """,
                        affected_booking_ids,
                    )

            conn.commit()

        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:
            conn.rollback()
            logger.exception("close_zone error: %s", exc)
            raise HTTPException(status_code=500, detail=f"ปิดโซนไม่สำเร็จ: {exc}")

    # ส่งอีเมลแจ้ง (mock) หลัง commit — ถึงอีเมลล้มก็ไม่ rollback DB
    for booking_id, email in affected:
        background_tasks.add_task(
            _mock_send_zone_closed_email, email, zone_name, concert_title, booking_id,
        )

    logger.info(
        "Zone closed: zone_id=%s concert=%s affected_bookings=%d seats_closed=%d",
        z_id, concert_id, len(affected_booking_ids), seats_closed,
    )

    return {
        "message": "ปิดโซนสำเร็จ",
        "zone_id": z_id,
        "zone_name": zone_name,
        "concert_id": concert_id,
        "seats_closed": seats_closed,
        "affected_bookings": len(affected_booking_ids),
        "notifications_queued": len(affected),
    }


# ---------------------------------------------------------------------------
# Refund approval — Organizer อนุมัติคำขอคืนเงินที่อยู่ใน refund_pending
# ---------------------------------------------------------------------------


@organizer_router.get("/concerts/{concert_id}/refund-pending")
def list_pending_refunds(concert_id: int, current_user: CurrentUser):
    """
    ดึงรายชื่อ booking ที่อยู่สถานะ 'refund_pending' ของคอนเสิร์ตที่ organizer เป็นเจ้าของ
    เพื่อแสดงให้ organizer กดอนุมัติได้
    """
    _check_organizer_role(current_user)
    organizer_profile_id = current_user.get("organizer_profile_id")
    if not organizer_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบ organizer profile ของคุณ")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT organizer_id FROM concert WHERE id = %s",
                (concert_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="ไม่พบ concert")
            if row[0] != organizer_profile_id:
                raise HTTPException(status_code=403, detail="ไม่ใช่ organizer ของคอนเสิร์ตนี้")

            cur.execute(
                """
                SELECT b.id, b.total_amount, b.total_tickets, b.created_at,
                       u.name, u.email,
                       r.id, r.bank_name, r.account_number, r.account_name, r.reason, r.requested_at
                FROM booking b
                JOIN customer_profile cp ON cp.id = b.customer_id
                JOIN users u ON u.id = cp.user_id
                LEFT JOIN payment p ON p.booking_id = b.id AND p.status = 'paid'
                LEFT JOIN refund r ON r.payment_id = p.id
                WHERE b.concert_id = %s AND b.status = 'refund_pending'
                ORDER BY b.created_at DESC
                """,
                (concert_id,),
            )
            rows = cur.fetchall()

    return [
        {
            "booking_id": r[0],
            "total_amount": float(r[1]) if r[1] is not None else 0,
            "total_tickets": r[2],
            "created_at": r[3].isoformat() if r[3] else None,
            "customer_name": r[4],
            "customer_email": r[5],
            "refund_id": r[6],
            "bank_name": r[7],
            "account_number": r[8],
            "account_name": r[9],
            "reason": r[10],
            "requested_at": r[11].isoformat() if r[11] else None,
        }
        for r in rows
    ]


@organizer_router.post("/bookings/{booking_id}/approve-refund")
def approve_refund(booking_id: int, current_user: CurrentUser):
    """
    Organizer อนุมัติคำขอคืนเงิน: booking → 'refunded', ลบ ticket (เคลียร์ UNIQUE(seat_id)),
    seat → 'available', refund row → 'completed', บันทึก finance หักลบ.
    Validate: organizer เป็นเจ้าของ concert + booking สถานะ 'refund_pending' เท่านั้น.
    """
    _check_organizer_role(current_user)
    organizer_profile_id = current_user.get("organizer_profile_id")
    if not organizer_profile_id:
        raise HTTPException(status_code=400, detail="ไม่พบ organizer profile ของคุณ")

    with get_db_connection() as conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT b.id, b.concert_id, b.status, b.total_amount, c.organizer_id
                    FROM booking b
                    JOIN concert c ON c.id = b.concert_id
                    WHERE b.id = %s
                    FOR UPDATE OF b
                    """,
                    (booking_id,),
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="ไม่พบ booking")

                b_id, concert_id, b_status, total_amount, owner_id = row

                if owner_id != organizer_profile_id:
                    raise HTTPException(status_code=403, detail="ไม่ใช่ organizer ของคอนเสิร์ตนี้")
                if b_status != "refund_pending":
                    raise HTTPException(
                        status_code=409,
                        detail=f"booking สถานะ '{b_status}' ไม่อยู่ในคิวขออนุมัติคืนเงิน",
                    )

                # ตั๋วที่ถูก check-in ไปแล้ว = ใช้งานเข้างานแล้ว ห้ามอนุมัติคืนเงิน
                # (ปกติเคสนี้ควรถูกบล็อกตั้งแต่ /api/v1/refunds/request แต่กันเหนียวอีกชั้น
                # เพราะถ้าปล่อยให้ DELETE ticket ดำเนินต่อ FK ของ ticket_checkin จะพัง 500)
                cur.execute(
                    """
                    SELECT COUNT(*) FROM ticket_checkin
                    WHERE ticket_id IN (SELECT id FROM ticket WHERE booking_id = %s)
                    """,
                    (b_id,),
                )
                if (cur.fetchone()[0] or 0) > 0:
                    raise HTTPException(
                        status_code=400,
                        detail="ไม่สามารถคืนเงินได้เนื่องจากตั๋วถูกใช้งานไปแล้ว (Ticket already checked in)",
                    )

                # หา seat_id ของ ticket ก่อนลบ
                cur.execute(
                    "SELECT seat_id FROM ticket WHERE booking_id = %s",
                    (b_id,),
                )
                seat_ids = [r[0] for r in cur.fetchall()]

                # ลบ ticket เพื่อเคลียร์ UNIQUE(seat_id) ตาม schema เดิม
                cur.execute("DELETE FROM ticket WHERE booking_id = %s", (b_id,))

                # ปลดที่นั่งกลับเป็น available
                if seat_ids:
                    cur.execute(
                        "UPDATE seat SET status = 'available' WHERE id = ANY(%s)",
                        (seat_ids,),
                    )

                # booking → refunded (terminal)
                cur.execute(
                    "UPDATE booking SET status = 'refunded' WHERE id = %s AND status = 'refund_pending'",
                    (b_id,),
                )
                if cur.rowcount != 1:
                    raise HTTPException(
                        status_code=409, detail="booking ถูกเปลี่ยนสถานะไปแล้ว"
                    )

                # refund row → completed (ถ้ามี)
                cur.execute(
                    """
                    UPDATE refund SET status = 'completed', completed_at = NOW()
                    WHERE payment_id IN (
                        SELECT id FROM payment WHERE booking_id = %s AND status = 'paid'
                    )
                    AND status <> 'completed'
                    """,
                    (b_id,),
                )

                # finance: บันทึกยอดหักออก (ลบ) จากรายได้ของ organizer
                cur.execute(
                    """
                    INSERT INTO finance (concert_id, booking_id, type, amount, description)
                    VALUES (%s, %s, 'refund', %s, 'organizer approved refund')
                    """,
                    (concert_id, b_id, -Decimal(total_amount)),
                )

            conn.commit()
            logger.info(
                "Refund approved: booking=%s concert=%s seats_released=%d amount=%s",
                b_id, concert_id, len(seat_ids), total_amount,
            )

        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:
            conn.rollback()
            logger.exception("approve_refund error: %s", exc)
            raise HTTPException(status_code=500, detail=f"อนุมัติคืนเงินไม่สำเร็จ: {exc}")

    return {
        "message": "อนุมัติคืนเงินสำเร็จ",
        "booking_id": b_id,
        "status": "refunded",
        "seats_released": len(seat_ids),
        "amount": f"{Decimal(total_amount):.2f}",
    }


# ---------------------------------------------------------------------------
# Phase 6 — Organizer Dashboard (สรุปรายรับรายจ่ายรายวันของคอนเสิร์ต)
# ---------------------------------------------------------------------------

class DailyStat(BaseModel):
    date: str
    income: Decimal
    expense: Decimal
    net_profit: Decimal


class GrandTotals(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    total_net_profit: Decimal


class DashboardResponse(BaseModel):
    concert_id: int
    daily_stats: list[DailyStat]
    grand_totals: GrandTotals


@organizer_router.get(
    "/concerts/{concert_id}/dashboard",
    response_model=DashboardResponse,
)
def get_concert_dashboard(concert_id: int, current_user: CurrentUser):
    """
    Phase 6 — สรุปรายรับ/รายจ่ายรายวันของคอนเสิร์ต (Asia/Bangkok timezone)
    อ่านตรงจาก finance ledger เป็น single source of truth:
      - amount > 0 → income (payment webhook, manual confirm)
      - amount < 0 → expense (organizer approved refund)
    finance.created_at ถูกเซ็ตอัตโนมัติตอน INSERT ในทรานแซกชันเดียวกับ
    payment/refund (ดู routes/payment.py, routes/organizer.py: approve_refund)
    """
    _check_organizer_role(current_user)
    organizer_profile_id = current_user.get("organizer_profile_id")
    if not organizer_profile_id:
        raise HTTPException(status_code=403, detail="ไม่พบ organizer profile")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT organizer_id FROM concert WHERE id = %s",
                (concert_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="ไม่พบคอนเสิร์ต")
            if row[0] != organizer_profile_id:
                raise HTTPException(
                    status_code=403,
                    detail="ไม่ใช่ organizer ของคอนเสิร์ตนี้",
                )

            cur.execute(
                """
                SELECT
                    (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date
                        AS day,
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS income,
                    SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS expense
                FROM finance
                WHERE concert_id = %s
                GROUP BY day
                ORDER BY day ASC
                """,
                (concert_id,),
            )
            rows = cur.fetchall()

    daily_stats = [
        DailyStat(
            date=day.isoformat(),
            income=income,
            expense=expense,
            net_profit=income - expense,
        )
        for (day, income, expense) in rows
    ]
    total_income = sum((d.income for d in daily_stats), Decimal("0"))
    total_expense = sum((d.expense for d in daily_stats), Decimal("0"))

    return DashboardResponse(
        concert_id=concert_id,
        daily_stats=daily_stats,
        grand_totals=GrandTotals(
            total_income=total_income,
            total_expense=total_expense,
            total_net_profit=total_income - total_expense,
        ),
    )