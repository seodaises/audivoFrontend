import { useSelector, useDispatch } from 'react-redux';
import { toggleColorMode } from '../slices/colorModeSlice';

export function useColorMode() {
  const mode = useSelector((state) => state.colorMode.mode);
  const dispatch = useDispatch();

  const toggle = () => dispatch(toggleColorMode());

  return { mode, toggle };
}

