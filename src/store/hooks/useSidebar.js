import { useSelector, useDispatch } from 'react-redux';
import {
  toggleSidebar as toggleSidebarAction,
  setSidebarHidden as setSidebarHiddenAction,
  togglePlaybar as togglePlaybarAction,
  setPlaybarHidden as setPlaybarHiddenAction,
} from '../slices/sidebarSlice';

export function useSidebar() {
  const sidebarHidden = useSelector((state) => state.sidebar.sidebarHidden);
  const playbarHidden = useSelector((state) => state.sidebar.playbarHidden);
  const dispatch = useDispatch();

  const toggleSidebar = () => dispatch(toggleSidebarAction());
  const setSidebarHidden = (v) => dispatch(setSidebarHiddenAction(v));
  const togglePlaybar = () => dispatch(togglePlaybarAction());
  const setPlaybarHidden = (v) => dispatch(setPlaybarHiddenAction(v));

  return {
    sidebarHidden, toggleSidebar, setSidebarHidden,
    playbarHidden, togglePlaybar, setPlaybarHidden,
  };
}