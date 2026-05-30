-- Generated SQL schema for InnDesk PMS

CREATE TABLE clients (
	id SERIAL NOT NULL, 
	first_name VARCHAR(100) NOT NULL, 
	last_name VARCHAR(100) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	phone VARCHAR(30), 
	nationality VARCHAR(100), 
	id_document VARCHAR(100), 
	gdpr_consent BOOLEAN NOT NULL, 
	gdpr_consent_at TIMESTAMP WITH TIME ZONE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id)
);

CREATE TABLE room_types (
	id SERIAL NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	description TEXT, 
	price_per_night NUMERIC(10, 2) NOT NULL, 
	max_occupancy INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT check_price_positive CHECK (price_per_night > 0), 
	CONSTRAINT check_max_occupancy_positive CHECK (max_occupancy > 0)
);

CREATE TABLE users (
	id SERIAL NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	full_name VARCHAR(255) NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	CONSTRAINT check_role CHECK (role IN ('admin', 'receptionist'))
);

CREATE TABLE rooms (
	id SERIAL NOT NULL, 
	number VARCHAR(10) NOT NULL, 
	floor INTEGER NOT NULL, 
	room_type_id INTEGER NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	notes TEXT, 
	PRIMARY KEY (id), 
	CONSTRAINT check_status CHECK (status IN ('available', 'occupied', 'dirty', 'cleaning', 'maintenance')), 
	FOREIGN KEY(room_type_id) REFERENCES room_types (id)
);

CREATE TABLE reservations (
	id SERIAL NOT NULL, 
	client_id INTEGER NOT NULL, 
	room_id INTEGER NOT NULL, 
	created_by INTEGER NOT NULL, 
	check_in_date DATE NOT NULL, 
	check_out_date DATE NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	adults INTEGER NOT NULL, 
	children INTEGER NOT NULL, 
	notes TEXT, 
	total_amount NUMERIC(10, 2), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	CONSTRAINT check_status CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')), 
	CONSTRAINT check_adults_positive CHECK (adults > 0), 
	CONSTRAINT check_children_not_negative CHECK (children >= 0), 
	CONSTRAINT chk_dates CHECK (check_out_date > check_in_date), 
	FOREIGN KEY(client_id) REFERENCES clients (id), 
	FOREIGN KEY(room_id) REFERENCES rooms (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);

CREATE TABLE invoices (
	id SERIAL NOT NULL, 
	reservation_id INTEGER NOT NULL, 
	nights_count INTEGER NOT NULL, 
	room_rate NUMERIC(10, 2) NOT NULL, 
	total_amount NUMERIC(10, 2) NOT NULL, 
	payment_method VARCHAR(50), 
	payment_status VARCHAR(20) NOT NULL, 
	paid_at TIMESTAMP WITH TIME ZONE, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	CONSTRAINT check_nights_positive CHECK (nights_count > 0), 
	CONSTRAINT check_payment_status CHECK (payment_status IN ('pending', 'paid')), 
	UNIQUE (reservation_id), 
	FOREIGN KEY(reservation_id) REFERENCES reservations (id)
);

