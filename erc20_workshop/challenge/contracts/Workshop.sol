// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract WorkshopToken {
    string public constant name = "Workshop Token";
    string public constant symbol = "WORK";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public claimed;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    function claim() external {
        require(!claimed[msg.sender], "Already claimed");
        claimed[msg.sender] = true;

        uint256 amount = 100 ether;
        totalSupply += amount;
        balanceOf[msg.sender] += amount;
        emit Transfer(address(0), msg.sender, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "Allowance too low");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "Zero address");
        require(balanceOf[from] >= amount, "Balance too low");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

contract Collector {
    WorkshopToken public immutable token;
    uint256 public constant REQUIRED = 25 ether;

    bool public solved;
    address public solver;

    error AllowanceNotExact();

    constructor(WorkshopToken _token) {
        token = _token;
    }

    function collect() external {
        require(!solved, "Already solved");
        if (token.allowance(msg.sender, address(this)) != REQUIRED) {
            revert AllowanceNotExact();
        }

        bool ok = token.transferFrom(msg.sender, address(this), REQUIRED);
        require(ok, "Transfer failed");

        solved = true;
        solver = msg.sender;
    }
}
