import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";

import HomePage from "./pages/HomePage";
import AllRestaurantPage from "./pages/AllRestaurantsPage.tsx";          
import HelpPage from "./pages/HelpPage";
import PromoPage from "./pages/PromotionPage";

import LoginPage from "./pages/login/Login";
import RegisterPage from "./pages/register/Register";
import ProfileLayout from "./layouts/ProfileLayout/index.tsx";
import ProfilePage from "./pages/account/Profile.tsx";
import ProfileOrderPage from "./pages/ProfileOrder.tsx";
import ProfilePromoPage from "./pages/ProfilePromo.tsx";
import RestaurantMenuPage from "./components/chaaim/RestaurantMenu.tsx";

// Rider
import RiderLayout from "./layouts/RiderLayout";
import RiderDashboard from "./pages/partner/rider/dashboard.tsx";
import RiderWork from "./pages/partner/rider/rider_work.tsx";
import RiderHistories from "./pages/partner/rider/rider_work_histories.tsx";
import RiderProfile from "./pages/partner/rider/rider_profile.tsx";
import RiderRegister from "./pages/register/RiderRegisterForm.tsx"

// Restaurant
import RestaurantLayout from "./layouts/RestaurantLayout";
import RestaurantMenu from "./pages/partner/restaurant/Restaurant_Menu.tsx";
import RestaurantOrder from "./pages/partner/restaurant/Restaurant_Order.tsx";
import RestaurantAcc from "./pages/partner/restaurant/OwnerRestaurantPage.tsx";
import RestaurantRegisterForm from './pages/register/RestaurantRegisterForm';

// Admin
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/admin_dashboard";
import AdminReport from "./pages/admin/admin_report";
import AdminRider from "./pages/admin/admin_rider";
import AdminRestaurants from "./pages/admin/admin_restaurant";
import AdminProfile from "./pages/admin/admin_profile";
import AdminPromotion from "./pages/admin/admin_promotion.tsx";

// User pages
import CartPage from "./pages/CartPage";
import ProfileChatPage from "./pages/ProfileChatPage.tsx";

// Payment
import PaymentLayout from "./layouts/PaymentLayout";
import Payment from "./pages/payment/payment";
import PaymentSuccess from "./pages/payment/payment_success";


import RestaurantReview from "./pages/RestaurantReview.tsx";
import ThankYouPage from "./pages/ThankYouPage.tsx";

export default function App() {
  return (
    <Routes>
      {/* Auth (ไม่มี Header) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
       
      </Route>

      {/* Main layout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/restaurants" element={<AllRestaurantPage />} />
        <Route path="/restaurants/:id/menus" element={<RestaurantMenuPage />} />
        <Route path="/promotions" element={<PromoPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/review" element={<RestaurantReview/>}/>
        <Route path="/thankyou" element={<ThankYouPage/>}/>
        <Route path="/partner/restaurant/register" element={<RestaurantRegisterForm />} />
        <Route path="/partner/rider/register" element={<RiderRegister/>}/>
      </Route>

      <Route
        path="/profile"
        element={<ProfileLayout />}
      >
        <Route index element={<ProfilePage/>}/>
        <Route path="orders" element={<ProfileOrderPage/>}/>
        <Route path="orders/:id" element={<ProfileOrderPage/>} />
        <Route path="promotion" element={<ProfilePromoPage/>}/>
        <Route path="chat" element={<ProfileChatPage/>}/>
      </Route>

      {/* Rider layout */}
      <Route
        path="/partner/rider"
        element={
            <RiderLayout />
        }
      >
        <Route index element={<RiderDashboard />} />
        <Route path="dashboard" element={<RiderDashboard />} />
        <Route path="work" element={<RiderWork />} />
        <Route path="histories" element={<RiderHistories />} />
        <Route path="profile" element={<RiderProfile />} />
      </Route>

      {/* Restaurant layout */}
      <Route 
        path="/partner/restaurant" 
        element={
          <RestaurantLayout />
        }
      >
        <Route index element={<RestaurantOrder />} />
        <Route path="order" element={<RestaurantOrder />} />
        <Route path="menu" element={<RestaurantMenu />} />
        <Route path="account" element={<RestaurantAcc />} />
      </Route>

      {/* Admin layout */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="report" element={<AdminReport />} />
        <Route path="rider" element={<AdminRider />} />
        <Route path="restaurant" element={<AdminRestaurants />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="promotion" element={<AdminPromotion />} />
      </Route>

      {/* Payment layout */}
      <Route path="/payment" element={<PaymentLayout />}>
        <Route index element={<Payment />} />
        <Route path="success" element={<PaymentSuccess />} />
      </Route>
    </Routes>
  );
}
