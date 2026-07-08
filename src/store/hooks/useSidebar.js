import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar as toggleSidebarAction, setSidebarHidden as setSidebarHiddenAction } from '../slices/sidebarSlice';

export function useSidebar() {
  const sidebarHidden = useSelector((state) => state.sidebar.sidebarHidden);
  const dispatch = useDispatch();

  const toggleSidebar = () => dispatch(toggleSidebarAction());
  const setSidebarHidden = (v) => dispatch(setSidebarHiddenAction(v));

  return { sidebarHidden, toggleSidebar, setSidebarHidden };
}

