'use client';

import React from 'react';
import styled from 'styled-components';

interface StyledCheckoutButtonProps {
  onClick: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
  text?: string;
  loadingText?: string;
}

const StyledCheckoutButton: React.FC<StyledCheckoutButtonProps> = ({
  onClick,
  isDisabled = false,
  isLoading = false,
  text = 'Checkout',
  loadingText = 'Processing...'
}) => {
  const handleClick = () => {
    if (!isDisabled && !isLoading) {
      onClick();
    }
  };

  return (
    <StyledWrapper>
      <div className={`container ${isDisabled || isLoading ? 'disabled' : ''}`} onClick={handleClick}>
        <div className="left-side">
          <div className="card">
            <div className="card-line" />
            <div className="buttons" />
          </div>
          <div className="post">
            <div className="post-line" />
            <div className="screen">
              <div className="dollar">₹</div>
            </div>
            <div className="numbers" />
            <div className="numbers-line2" />
          </div>
        </div>
        <div className="right-side">
          <div className="new">{isLoading ? loadingText : text}</div>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .container {
    background-color: #ffffff;
    display: flex;
    width: 270px;
    height: 120px;
    position: relative;
    border-radius: 6px;
    transition: 0.3s ease-in-out;
    cursor: pointer;
    margin: 0 auto;
  }

  .container:hover:not(.disabled) {
    transform: scale(1.03);
  }

  .container.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .container:hover:not(.disabled) .left-side {
    width: 100%;
  }

  .left-side {
    background-color: #5de2a3;
    width: 130px;
    height: 120px;
    border-radius: 4px;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: 0.3s;
    flex-shrink: 0;
    overflow: hidden;
  }

  .right-side {
    display: flex;
    align-items: center;
    overflow: hidden;
    cursor: pointer;
    justify-content: space-between;
    white-space: nowrap;
    transition: 0.3s;
  }

  .right-side:hover:not(.container.disabled *) {
    background-color: #f9f7f9;
  }

  .arrow {
    width: 20px;
    height: 20px;
    margin-right: 20px;
  }

  .new {
    font-size: 18px;
    font-family: "Lexend Deca", sans-serif;
    margin-left: 12px;
    color: #2c2c27;
  }

  .card {
    width: 35px;
    height: 23px;
    background-color: #c7ffbc;
    border-radius: 3px;
    position: absolute;
    display: flex;
    z-index: 10;
    flex-direction: column;
    align-items: center;
    -webkit-box-shadow: 4px 4px 4px -1px rgba(77, 200, 143, 0.72);
    -moz-box-shadow: 4px 4px 4px -1px rgba(77, 200, 143, 0.72);
    box-shadow: 4px 4px 4px -1px rgba(77, 200, 143, 0.72);
  }

  .card-line {
    width: 32px;
    height: 6px;
    background-color: #80ea69;
    border-radius: 2px;
    margin-top: 3px;
  }

  @media only screen and (max-width: 480px) {
    .container {
      transform: scale(0.7);
    }

    .container:hover:not(.disabled) {
      transform: scale(0.74);
    }

    .new {
      font-size: 11px;
    }
  }

  .buttons {
    width: 4px;
    height: 4px;
    background-color: #379e1f;
    box-shadow: 0 -5px 0 0 #26850e, 0 5px 0 0 #56be3e;
    border-radius: 50%;
    margin-top: 2px;
    transform: rotate(90deg);
    margin: 5px 0 0 -15px;
  }

  .container:hover:not(.disabled) .card {
    animation: slide-top 1.2s cubic-bezier(0.645, 0.045, 0.355, 1) both;
  }

  .container:hover:not(.disabled) .post {
    animation: slide-post 1s cubic-bezier(0.165, 0.84, 0.44, 1) both;
  }

  @keyframes slide-top {
    0% {
      -webkit-transform: translateY(0);
      transform: translateY(0);
    }

    50% {
      -webkit-transform: translateY(-70px) rotate(90deg);
      transform: translateY(-70px) rotate(90deg);
    }

    60% {
      -webkit-transform: translateY(-70px) rotate(90deg);
      transform: translateY(-70px) rotate(90deg);
    }

    100% {
      -webkit-transform: translateY(-8px) rotate(90deg);
      transform: translateY(-8px) rotate(90deg);
    }
  }

  .post {
    width: 63px;
    height: 75px;
    background-color: #dddde0;
    position: absolute;
    z-index: 11;
    bottom: 10px;
    top: 120px;
    border-radius: 6px;
    overflow: hidden;
  }

  .post-line {
    width: 47px;
    height: 9px;
    background-color: #545354;
    position: absolute;
    border-radius: 0px 0px 3px 3px;
    right: 8px;
    top: 8px;
  }

  .post-line:before {
    content: "";
    position: absolute;
    width: 47px;
    height: 9px;
    background-color: #757375;
    top: -8px;
  }

  .screen {
    width: 47px;
    height: 23px;
    background-color: #ffffff;
    position: absolute;
    top: 22px;
    right: 8px;
    border-radius: 3px;
  }

  .numbers {
    width: 12px;
    height: 12px;
    background-color: #838183;
    box-shadow: 0 -18px 0 0 #838183, 0 18px 0 0 #838183;
    border-radius: 2px;
    position: absolute;
    transform: rotate(90deg);
    left: 25px;
    top: 52px;
  }

  .numbers-line2 {
    width: 12px;
    height: 12px;
    background-color: #aaa9ab;
    box-shadow: 0 -18px 0 0 #aaa9ab, 0 18px 0 0 #aaa9ab;
    border-radius: 2px;
    position: absolute;
    transform: rotate(90deg);
    left: 25px;
    top: 68px;
  }

  @keyframes slide-post {
    50% {
      -webkit-transform: translateY(0);
      transform: translateY(0);
    }

    100% {
      -webkit-transform: translateY(-70px);
      transform: translateY(-70px);
    }
  }

  .dollar {
    position: absolute;
    font-size: 16px;
    font-family: "Lexend Deca", sans-serif;
    width: 100%;
    left: 0;
    top: 0;
    color: #4b953b;
    text-align: center;
  }

  .container:hover:not(.disabled) .dollar {
    animation: fade-in-fwd 0.3s 1s backwards;
  }

  @keyframes fade-in-fwd {
    0% {
      opacity: 0;
      transform: translateY(-5px);
    }

    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export default StyledCheckoutButton;