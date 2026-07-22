from sqlalchemy.orm import Session

from backend.models.reservation import Reservation
from backend.models.room import Room


def find_available_room(
    db: Session,
    room_type_id: int,
    check_in_date,
    check_out_date,
    exclude_reservation_id: int | None = None
):
    """
    Find the first available room of the given type for the date range.
    Returns a Room object, or None if no room is available.
    Overlap condition: existing.check_in < new_check_out AND existing.check_out > new_check_in
    Uses SELECT FOR UPDATE to prevent race conditions.
    """
    rooms = db.query(Room).filter(
        Room.room_type_id == room_type_id,
        # A room that is occupied, dirty or being cleaned now can still be
        # assigned to a non-overlapping future stay. Maintenance is the only
        # operational status that removes it from inventory.
        Room.status != "maintenance"
    ).with_for_update(skip_locked=True).all()

    for room in rooms:
        query = db.query(Reservation).filter(
            Reservation.room_id == room.id,
            Reservation.status.in_(["confirmed", "checked_in"]),
            Reservation.check_in_date < check_out_date,
            Reservation.check_out_date > check_in_date,
        )
        if exclude_reservation_id:
            query = query.filter(Reservation.id != exclude_reservation_id)
        if query.first() is None:
            return room
    return None
