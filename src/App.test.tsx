import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the police login page at the root route', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '경찰 로그인' })).toBeInTheDocument()
  })
})
