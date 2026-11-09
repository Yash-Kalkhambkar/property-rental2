"""
Production seed script - Non-interactive version for Render deployment
Creates: Owner (Yash) + 2 Tenants (Veda, Suhani) + Properties + Units + Leases + Payments
"""
import sys
import os
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session
from bcrypt import hashpw, gensalt

from app.core.database import SessionLocal
from app.models.owner import Owner
from app.models.tenant import Tenant
from app.models.property import Property
from app.models.unit import Unit
from app.models.lease import Lease
from app.models.payment import Payment


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return hashpw(password.encode(), gensalt()).decode()


def seed_production_data():
    """
    Seed production database with demo data.
    If data exists, it will be skipped (idempotent).
    Use environment variable FORCE_RESEED=true to delete and recreate.
    """
    db: Session = SessionLocal()
    
    try:
        print("=" * 70)
        print("SEEDING PRODUCTION DATA - Property Rental Management System")
        print("=" * 70)
        
        # Check if owner already exists
        existing_owner = db.query(Owner).filter(Owner.email == "yash@gmail.com").first()
        force_reseed = os.environ.get("FORCE_RESEED", "").lower() == "true"
        
        if existing_owner:
            if force_reseed:
                print("\n⚠️  FORCE_RESEED=true - Deleting existing data...")
                db.delete(existing_owner)
                db.commit()
                print("✓ Existing data deleted")
            else:
                print("\n✓ Demo data already exists!")
                print("   Owner yash@gmail.com is already in the database.")
                print("   To reseed, run with: FORCE_RESEED=true python seed_production_data.py")
                return
        
        # ═══════════════════════════════════════════════════════════════════
        # 1. CREATE OWNER - Yash
        # ═══════════════════════════════════════════════════════════════════
        print("\n📝 Creating Owner...")
        owner = Owner(
            email="yash@gmail.com",
            password_hash=hash_password("yash@123"),
            full_name="Yash Kalkhambkar",
            phone="+91-9876543210"
        )
        db.add(owner)
        db.flush()
        print(f"✓ Owner created: {owner.full_name} ({owner.email})")
        
        # ═══════════════════════════════════════════════════════════════════
        # 2. CREATE PROPERTIES
        # ═══════════════════════════════════════════════════════════════════
        print("\n🏢 Creating Properties...")
        
        property1 = Property(
            owner_id=owner.id,
            name="Sunrise Apartments",
            address_line="123 MG Road, Near City Mall",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
            property_type="RESIDENTIAL",
            total_units=3
        )
        db.add(property1)
        db.flush()
        print(f"✓ Property 1: {property1.name}")
        
        property2 = Property(
            owner_id=owner.id,
            name="TechHub Business Center",
            address_line="456 Link Road, Andheri West",
            city="Mumbai",
            state="Maharashtra",
            pincode="400053",
            property_type="COMMERCIAL",
            total_units=2
        )
        db.add(property2)
        db.flush()
        print(f"✓ Property 2: {property2.name}")
        
        # ═══════════════════════════════════════════════════════════════════
        # 3. CREATE UNITS
        # ═══════════════════════════════════════════════════════════════════
        print("\n🏠 Creating Units...")
        
        unit1 = Unit(
            property_id=property1.id,
            unit_number="A-101",
            floor=1,
            area_sqft=Decimal("850.00"),
            unit_type="2BHK",
            monthly_rent=Decimal("25000.00"),
            deposit_amount=Decimal("50000.00"),
            status="OCCUPIED",
            amenities=["Parking", "Gym", "Swimming Pool", "Power Backup"]
        )
        db.add(unit1)
        
        unit2 = Unit(
            property_id=property1.id,
            unit_number="B-205",
            floor=2,
            area_sqft=Decimal("1200.00"),
            unit_type="3BHK",
            monthly_rent=Decimal("35000.00"),
            deposit_amount=Decimal("70000.00"),
            status="OCCUPIED",
            amenities=["Parking", "Gym", "Swimming Pool", "Power Backup", "Balcony"]
        )
        db.add(unit2)
        
        unit3 = Unit(
            property_id=property1.id,
            unit_number="C-301",
            floor=3,
            area_sqft=Decimal("950.00"),
            unit_type="2BHK",
            monthly_rent=Decimal("28000.00"),
            deposit_amount=Decimal("56000.00"),
            status="VACANT",
            amenities=["Parking", "Gym", "Swimming Pool", "Power Backup"]
        )
        db.add(unit3)
        
        unit4 = Unit(
            property_id=property2.id,
            unit_number="G-01",
            floor=0,
            area_sqft=Decimal("500.00"),
            unit_type="SHOP",
            monthly_rent=Decimal("40000.00"),
            deposit_amount=Decimal("120000.00"),
            status="VACANT",
            amenities=["Parking", "24x7 Security", "Lift"]
        )
        db.add(unit4)
        
        unit5 = Unit(
            property_id=property2.id,
            unit_number="201",
            floor=2,
            area_sqft=Decimal("1500.00"),
            unit_type="OFFICE",
            monthly_rent=Decimal("60000.00"),
            deposit_amount=Decimal("180000.00"),
            status="VACANT",
            amenities=["Parking", "24x7 Security", "Lift", "Cafeteria", "Conference Room"]
        )
        db.add(unit5)
        db.flush()
        print(f"✓ Created 5 units")
        
        # ═══════════════════════════════════════════════════════════════════
        # 4. CREATE TENANTS
        # ═══════════════════════════════════════════════════════════════════
        print("\n👥 Creating Tenants...")
        
        tenant_veda = Tenant(
            owner_id=owner.id,
            full_name="Veda Sharma",
            email="veda@gmail.com",
            password_hash=hash_password("veda@123"),
            phone="+91-9123456789",
            emergency_contact_name="Rajesh Sharma (Father)",
            emergency_contact_phone="+91-9876512345",
            id_type="AADHAAR",
            id_number="1234-5678-9012",
            notes="Working professional at TCS."
        )
        db.add(tenant_veda)
        
        tenant_suhani = Tenant(
            owner_id=owner.id,
            full_name="Suhani Patel",
            email="suhani@gmail.com",
            password_hash=hash_password("suhani@123"),
            phone="+91-9988776655",
            emergency_contact_name="Meera Patel (Mother)",
            emergency_contact_phone="+91-9876598765",
            id_type="PAN",
            id_number="ABCDE1234F",
            notes="Software engineer."
        )
        db.add(tenant_suhani)
        db.flush()
        print(f"✓ Tenant 1: {tenant_veda.full_name}")
        print(f"✓ Tenant 2: {tenant_suhani.full_name}")
        
        # ═══════════════════════════════════════════════════════════════════
        # 5. CREATE LEASES
        # ═══════════════════════════════════════════════════════════════════
        print("\n📄 Creating Leases...")
        
        lease_start_veda = date.today() - timedelta(days=180)
        lease_end_veda = lease_start_veda + timedelta(days=365)
        
        lease_veda = Lease(
            unit_id=unit1.id,
            tenant_id=tenant_veda.id,
            start_date=lease_start_veda,
            end_date=lease_end_veda,
            monthly_rent=unit1.monthly_rent,
            deposit_paid=unit1.deposit_amount,
            rent_due_day=5,
            status="ACTIVE",
            notes="11-month lease agreement."
        )
        db.add(lease_veda)
        
        lease_start_suhani = date.today() - timedelta(days=90)
        lease_end_suhani = lease_start_suhani + timedelta(days=365)
        
        lease_suhani = Lease(
            unit_id=unit2.id,
            tenant_id=tenant_suhani.id,
            start_date=lease_start_suhani,
            end_date=lease_end_suhani,
            monthly_rent=unit2.monthly_rent,
            deposit_paid=unit2.deposit_amount,
            rent_due_day=1,
            status="ACTIVE",
            notes="12-month lease agreement."
        )
        db.add(lease_suhani)
        db.flush()
        print(f"✓ Lease 1: {tenant_veda.full_name} → Unit A-101")
        print(f"✓ Lease 2: {tenant_suhani.full_name} → Unit B-205")
        
        # ═══════════════════════════════════════════════════════════════════
        # 6. CREATE PAYMENTS
        # ═══════════════════════════════════════════════════════════════════
        print("\n💰 Creating Payment Records...")
        
        payment_count = 0
        
        # Veda's Payments (6 months)
        for i in range(6, 0, -1):
            payment_date = date.today() - timedelta(days=i*30)
            due_date = date(payment_date.year, payment_date.month, lease_veda.rent_due_day)
            
            if i > 1:  # First 5 months - PAID
                paid_date = due_date + timedelta(days=2)
                payment = Payment(
                    lease_id=lease_veda.id,
                    amount_due=lease_veda.monthly_rent,
                    amount_paid=lease_veda.monthly_rent,
                    due_date=due_date,
                    paid_date=paid_date,
                    payment_method="UPI",
                    reference_number=f"UPI{1000+i}REF{tenant_veda.id[:8].upper()}",
                    status="PAID"
                )
            else:  # Current month - PENDING
                payment = Payment(
                    lease_id=lease_veda.id,
                    amount_due=lease_veda.monthly_rent,
                    amount_paid=Decimal("0.00"),
                    due_date=due_date,
                    status="PENDING"
                )
            
            db.add(payment)
            payment_count += 1
        
        # Suhani's Payments (3 months)
        for i in range(3, 0, -1):
            payment_date = date.today() - timedelta(days=i*30)
            due_date = date(payment_date.year, payment_date.month, lease_suhani.rent_due_day)
            
            if i > 1:  # First 2 months - PAID
                paid_date = due_date - timedelta(days=1)
                payment = Payment(
                    lease_id=lease_suhani.id,
                    amount_due=lease_suhani.monthly_rent,
                    amount_paid=lease_suhani.monthly_rent,
                    due_date=due_date,
                    paid_date=paid_date,
                    payment_method="BANK_TRANSFER",
                    reference_number=f"NEFT{2000+i}{tenant_suhani.id[:8].upper()}",
                    status="PAID"
                )
            else:  # Current month - PARTIAL
                paid_date = due_date + timedelta(days=3)
                payment = Payment(
                    lease_id=lease_suhani.id,
                    amount_due=lease_suhani.monthly_rent,
                    amount_paid=Decimal("20000.00"),
                    due_date=due_date,
                    paid_date=paid_date,
                    payment_method="UPI",
                    reference_number=f"UPI{3000}PARTIAL",
                    status="PARTIAL"
                )
            
            db.add(payment)
            payment_count += 1
        
        # Add one OVERDUE payment
        overdue_date = date.today() - timedelta(days=45)
        overdue_payment = Payment(
            lease_id=lease_veda.id,
            amount_due=Decimal("5000.00"),
            amount_paid=Decimal("0.00"),
            due_date=overdue_date,
            status="OVERDUE",
            notes="Late fee"
        )
        db.add(overdue_payment)
        payment_count += 1
        
        print(f"✓ Created {payment_count} payment records")
        
        # ═══════════════════════════════════════════════════════════════════
        # COMMIT ALL CHANGES
        # ═══════════════════════════════════════════════════════════════════
        db.commit()
        
        print("\n" + "=" * 70)
        print("✅ PRODUCTION DATA SEEDED SUCCESSFULLY!")
        print("=" * 70)
        print(f"\n📊 Summary:")
        print(f"  • 1 Owner (Yash)")
        print(f"  • 2 Properties")
        print(f"  • 5 Units (2 Occupied, 3 Vacant)")
        print(f"  • 2 Tenants (Veda + Suhani)")
        print(f"  • 2 Active Leases")
        print(f"  • {payment_count} Payment Records")
        
        print(f"\n🔑 Login Credentials:")
        print(f"  Owner:  yash@gmail.com / yash@123")
        print(f"  Tenant: veda@gmail.com / veda@123")
        print(f"  Tenant: suhani@gmail.com / suhani@123")
        print("=" * 70)
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        db.close()


if __name__ == "__main__":
    seed_production_data()
