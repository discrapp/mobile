import React from 'react';
import { render } from '../test-utils';
import ModalScreen from '../../app/modal';

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Mock EditScreenInfo component
jest.mock('../../components/EditScreenInfo', () => 'EditScreenInfo');

describe('ModalScreen', async () => {
  it('renders modal title', async () => {
    const { getByText } = await render(<ModalScreen />);

    expect(getByText('Modal')).toBeTruthy();
  });

  it('renders correctly', async () => {
    const { UNSAFE_root } = await render(<ModalScreen />);

    expect(UNSAFE_root).toBeTruthy();
  });
});
