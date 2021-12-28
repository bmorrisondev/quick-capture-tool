import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import styled from 'styled-components';
import { Button } from 'react-bootstrap';

const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
  height: 100%;

  .input-wrapper {
    padding: 7px;
    border-radius: 5px;
    border: 1px solid #eee;
    width: 80%;
  }

  input {
    font-size: 18px;
    border: none;
    width: 100%;

    &:focus {
      outline: none;
    }
  }
`;

const Hello = () => {
  return (
    <Wrapper>
      <div className="input-wrapper">
        <input type="text" placeholder="What would you like to capture?" />
      </div>
    </Wrapper>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
