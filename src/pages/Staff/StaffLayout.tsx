import { Outlet } from "react-router-dom";
import { StaffProvider } from "./StaffContext";

export default function StaffLayout() {
  return (
    <StaffProvider>
      <Outlet />
    </StaffProvider>
  );
}
