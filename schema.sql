-- =====================================================
-- SCHEMA WEBSITE BÁN HÀNG - Supabase / PostgreSQL
-- Bảng: profiles (Users), categories, products, orders, order_items
-- =====================================================

-- ---------- ENUM ----------
create type user_role as enum ('customer', 'admin');
create type order_status as enum ('pending', 'confirmed', 'shipping', 'completed', 'cancelled');
create type payment_status as enum ('unpaid', 'paid', 'refunded');

-- ---------- 1. USERS (profiles) ----------
-- Supabase Auth quản lý email/mật khẩu trong auth.users.
-- Bảng profiles lưu thông tin bổ sung, dùng chung id với auth.users.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text,
  address     text,
  avatar_url  text,
  role        user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Tự tạo profile khi có user đăng ký
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. CATEGORIES ----------
create table public.categories (
  id    bigint generated always as identity primary key,
  name  text not null unique,
  slug  text not null unique
);

-- ---------- 3. PRODUCTS ----------
create table public.products (
  id           bigint generated always as identity primary key,
  category_id  bigint references public.categories(id) on delete set null,
  name         text not null,
  slug         text not null unique,
  description  text,
  price        numeric(12,2) not null check (price >= 0),
  stock        integer not null default 0 check (stock >= 0),
  image_url    text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_products_category on public.products(category_id);

-- ---------- 4. ORDERS ----------
create table public.orders (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references public.profiles(id) on delete restrict,
  status           order_status not null default 'pending',
  payment_status   payment_status not null default 'unpaid',
  total_amount     numeric(12,2) not null default 0 check (total_amount >= 0),
  -- Lưu snapshot thông tin giao hàng tại thời điểm đặt
  shipping_name    text not null,
  shipping_phone   text not null,
  shipping_address text not null,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_orders_user on public.orders(user_id);
create index idx_orders_status on public.orders(status);

-- ---------- 5. ORDER_ITEMS (chi tiết đơn hàng) ----------
create table public.order_items (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references public.orders(id) on delete cascade,
  product_id  bigint not null references public.products(id) on delete restrict,
  quantity    integer not null check (quantity > 0),
  -- Lưu giá tại thời điểm mua, tránh sai lệch khi giá sản phẩm đổi
  unit_price  numeric(12,2) not null check (unit_price >= 0)
);

create index idx_order_items_order on public.order_items(order_id);

-- ---------- TỰ CẬP NHẬT updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (bắt buộc bật trên Supabase)
-- =====================================================
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Hàm kiểm tra admin
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- profiles: chỉ xem/sửa hồ sơ của mình (admin xem được tất cả)
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = 'customer'); -- không tự nâng quyền

-- categories & products: ai cũng xem được, chỉ admin được sửa
create policy "categories_read" on public.categories for select using (true);
create policy "categories_admin" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "products_read" on public.products
  for select using (is_active or public.is_admin());
create policy "products_admin" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- orders: user chỉ thấy và tạo đơn của mình
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());
create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid() = user_id);
create policy "orders_update_admin" on public.orders
  for update using (public.is_admin());

-- order_items: theo quyền của đơn hàng cha
create policy "order_items_select" on public.order_items
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );
create policy "order_items_insert" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o
            where o.id = order_id and o.user_id = auth.uid())
  );
