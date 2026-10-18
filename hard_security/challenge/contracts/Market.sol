// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Asset {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    address public owner;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory tokenName, string memory tokenSymbol) {
        owner = msg.sender;
        name = tokenName;
        symbol = tokenSymbol;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "not owner");
        totalSupply += amount;
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
    }
}

contract SpotPool {
    Asset public immutable weth;
    Asset public immutable usd;

    uint256 public reserveWeth;
    uint256 public reserveUsd;

    constructor(Asset wethToken, Asset usdToken) {
        weth = wethToken;
        usd = usdToken;
    }

    function initialize() external {
        require(reserveWeth == 0 && reserveUsd == 0, "seeded");
        reserveWeth = weth.balanceOf(address(this));
        reserveUsd = usd.balanceOf(address(this));
        require(reserveWeth > 0 && reserveUsd > 0, "empty");
    }

    function wethPrice() public view returns (uint256) {
        return reserveUsd * 1e18 / reserveWeth;
    }

    function swapWethForUsd(uint256 wethIn) external returns (uint256 usdOut) {
        require(reserveWeth > 0 && wethIn > 0, "not ready");
        weth.transferFrom(msg.sender, address(this), wethIn);
        uint256 newWeth = reserveWeth + wethIn;
        uint256 newUsd = ceilDiv(reserveWeth * reserveUsd, newWeth);
        require(newUsd < reserveUsd, "no output");
        usdOut = reserveUsd - newUsd;
        reserveWeth = newWeth;
        reserveUsd = newUsd;
        usd.transfer(msg.sender, usdOut);
    }

    function takeWeth(uint256 wethOut) external returns (uint256 usdIn) {
        require(reserveWeth > wethOut && wethOut > 0, "liquidity");
        uint256 newWeth = reserveWeth - wethOut;
        uint256 newUsd = ceilDiv(reserveWeth * reserveUsd, newWeth);
        usdIn = newUsd - reserveUsd;
        usd.transferFrom(msg.sender, address(this), usdIn);
        reserveWeth = newWeth;
        reserveUsd = newUsd;
        weth.transfer(msg.sender, wethOut);
    }

    function ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        return (a + b - 1) / b;
    }
}

interface IFlashBorrower {
    function onFlash(uint256 amount, bytes calldata data) external;
}

contract FlashLender {
    Asset public immutable weth;

    constructor(Asset wethToken) {
        weth = wethToken;
    }

    function flash(uint256 amount, bytes calldata data) external {
        uint256 balanceBefore = weth.balanceOf(address(this));
        require(amount > 0 && amount <= balanceBefore, "liquidity");
        weth.transfer(msg.sender, amount);
        IFlashBorrower(msg.sender).onFlash(amount, data);
        require(weth.balanceOf(address(this)) >= balanceBefore, "repay");
    }
}

contract Lender {
    Asset public immutable weth;
    Asset public immutable usd;
    SpotPool public immutable pool;

    mapping(address => uint256) public collateral;
    mapping(address => uint256) public debt;
    uint256 public totalBorrowed;

    constructor(Asset wethToken, Asset usdToken, SpotPool spotPool) {
        weth = wethToken;
        usd = usdToken;
        pool = spotPool;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "zero");
        usd.transferFrom(msg.sender, address(this), amount);
        collateral[msg.sender] += amount;
    }

    function maxBorrow(address account) public view returns (uint256) {
        uint256 price = pool.wethPrice();
        if (price == 0) return 0;
        uint256 capacity = collateral[account] * 1e18 / price / 2;
        if (capacity <= debt[account]) return 0;
        return capacity - debt[account];
    }

    function borrow(uint256 amount) external {
        require(amount > 0 && amount <= weth.balanceOf(address(this)), "liquidity");
        require(amount <= maxBorrow(msg.sender), "collateral");
        debt[msg.sender] += amount;
        totalBorrowed += amount;
        weth.transfer(msg.sender, amount);
    }

    function solved() external view returns (bool) {
        return totalBorrowed > 0 && weth.balanceOf(address(this)) == 0;
    }
}
