import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import {
  DESKTOP_VIEWPORT_WIDTH,
  MOBILE_VIEWPORT_WIDTH,
  setViewportWidth,
} from './setupTests';

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

const renderApp = async () => {
  let renderResult;

  await act(async () => {
    renderResult = render(<App />);
  });

  return renderResult;
};

test('renders the home page title', async () => {
  await renderApp();

  expect(screen.getByText(/Welcome to World Chase Tag Statistics/i)).toBeInTheDocument();
});

test('keeps the desktop sidebar expanded by default', async () => {
  act(() => {
    setViewportWidth(DESKTOP_VIEWPORT_WIDTH);
  });

  const { container } = await renderApp();
  const sider = container.querySelector('.app-shell__sider');

  expect(sider).not.toBeNull();
  expect(sider).not.toHaveClass('ant-layout-sider-collapsed');
  expect(screen.queryByText('Navigation')).not.toBeInTheDocument();
});

test('shows admin navigation links in the mobile drawer', async () => {
  localStorage.setItem(
    'user',
    JSON.stringify({ username: 'admin', role: 'Admin' })
  );

  act(() => {
    setViewportWidth(MOBILE_VIEWPORT_WIDTH);
  });

  const { container } = await renderApp();
  const trigger = container.querySelector('.app-shell__trigger');

  expect(trigger).not.toBeNull();
  expect(container.querySelector('.app-shell__sider')).toBeNull();

  fireEvent.click(trigger);

  expect(await screen.findByText('Navigation')).toBeInTheDocument();
  expect(screen.getByText('Manage Players')).toBeInTheDocument();
  expect(screen.getByText('Manage Matches')).toBeInTheDocument();
});

test('restores the expanded desktop sidebar after crossing breakpoints', async () => {
  act(() => {
    setViewportWidth(DESKTOP_VIEWPORT_WIDTH);
  });

  const { container } = await renderApp();

  expect(container.querySelector('.app-shell__sider')).not.toHaveClass('ant-layout-sider-collapsed');

  act(() => {
    setViewportWidth(MOBILE_VIEWPORT_WIDTH);
  });

  expect(container.querySelector('.app-shell__sider')).toBeNull();

  act(() => {
    setViewportWidth(DESKTOP_VIEWPORT_WIDTH);
  });

  await waitFor(() => {
    const sider = container.querySelector('.app-shell__sider');

    expect(sider).not.toBeNull();
    expect(sider).not.toHaveClass('ant-layout-sider-collapsed');
  });
});