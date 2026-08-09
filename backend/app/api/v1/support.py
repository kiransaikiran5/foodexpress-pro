from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.customer import Customer
from app.models.support_ticket import SupportTicket, TicketStatus
from app.schemas.support_ticket import TicketCreate, TicketUpdate, TicketOut
from app.api.deps import get_current_active_user, role_required

router = APIRouter(prefix="/support", tags=["Support Tickets"])

# ---------- Helper ----------
def get_customer(user: User, db: Session) -> Customer:
    if user.role != RoleEnum.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers")
    cust = db.query(Customer).filter(Customer.user_id == user.id).first()
    if not cust:
        cust = Customer(user_id=user.id)
        db.add(cust)
        db.commit()
        db.refresh(cust)
    return cust

# ---------- Customer: Raise a ticket ----------
@router.post("/tickets", response_model=TicketOut)
def raise_ticket(
    data: TicketCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    ticket = SupportTicket(
        customer_id=customer.id,
        subject=data.subject,
        description=data.description,
        category=data.category,
        priority=data.priority,
        order_id=data.order_id,
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket

# ---------- Customer: List my tickets ----------
@router.get("/tickets", response_model=List[TicketOut])
def my_tickets(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    tickets = db.query(SupportTicket).filter(
        SupportTicket.customer_id == customer.id
    ).order_by(SupportTicket.created_at.desc()).all()
    return tickets

# ---------- Customer: Get ticket detail ----------
@router.get("/tickets/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    customer = get_customer(current_user, db)
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.customer_id == customer.id
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

# ---------- Admin: Get all tickets ----------
@router.get("/admin/tickets", response_model=List[TicketOut])
def all_tickets(
    status_filter: Optional[str] = None,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    query = db.query(SupportTicket).order_by(SupportTicket.created_at.desc())
    if status_filter:
        query = query.filter(SupportTicket.status == status_filter)
    return query.all()

# ---------- Admin: Update ticket status / assign / resolve ----------
@router.put("/admin/tickets/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: int,
    update: TicketUpdate,
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    ticket = db.query(SupportTicket).get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if update.status is not None:
        ticket.status = update.status
    if update.assigned_to is not None:
        ticket.assigned_to = update.assigned_to
    if update.resolution_notes is not None:
        ticket.resolution_notes = update.resolution_notes
    db.commit()
    db.refresh(ticket)
    return ticket

# ---------- Admin: Dashboard stats ----------
@router.get("/admin/dashboard")
def support_dashboard(
    current_user: User = Depends(role_required(RoleEnum.ADMIN)),
    db: Session = Depends(get_db)
):
    total = db.query(SupportTicket).count()
    open_tickets = db.query(SupportTicket).filter(SupportTicket.status == TicketStatus.OPEN).count()
    in_progress = db.query(SupportTicket).filter(SupportTicket.status == TicketStatus.IN_PROGRESS).count()
    resolved = db.query(SupportTicket).filter(SupportTicket.status == TicketStatus.RESOLVED).count()
    return {
        "total": total,
        "open": open_tickets,
        "in_progress": in_progress,
        "resolved": resolved
    }