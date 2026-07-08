// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TinyTreaty {
    uint256 public nextTreatyId = 1;

    struct TreatyEntry {
        address proposer;
        address signer;
        string title;
        string counterparty;
        string terms;
        string stamp;
        uint256 createdAt;
        uint256 signedAt;
        bool accepted;
    }

    mapping(uint256 => TreatyEntry) private treaties;

    event TreatyCreated(
        uint256 indexed treatyId,
        address indexed proposer,
        string title,
        string counterparty
    );

    event TreatyAccepted(
        uint256 indexed treatyId,
        address indexed proposer,
        address indexed signer
    );

    function createTreaty(
        string calldata title,
        string calldata counterparty,
        string calldata terms,
        string calldata stamp
    ) external returns (uint256 treatyId) {
        require(bytes(title).length > 0 && bytes(title).length <= 48, "Invalid title");
        require(bytes(counterparty).length > 0 && bytes(counterparty).length <= 40, "Invalid counterparty");
        require(bytes(terms).length > 0 && bytes(terms).length <= 240, "Invalid terms");
        require(bytes(stamp).length > 0 && bytes(stamp).length <= 18, "Invalid stamp");

        treatyId = nextTreatyId++;
        treaties[treatyId] = TreatyEntry({
            proposer: msg.sender,
            signer: address(0),
            title: title,
            counterparty: counterparty,
            terms: terms,
            stamp: stamp,
            createdAt: block.timestamp,
            signedAt: 0,
            accepted: false
        });

        emit TreatyCreated(treatyId, msg.sender, title, counterparty);
    }

    function acceptTreaty(uint256 treatyId) external {
        TreatyEntry storage entry = treaties[treatyId];
        require(entry.proposer != address(0), "Treaty missing");
        require(!entry.accepted, "Already accepted");
        require(msg.sender != entry.proposer, "Proposer cannot accept");

        entry.signer = msg.sender;
        entry.signedAt = block.timestamp;
        entry.accepted = true;

        emit TreatyAccepted(treatyId, entry.proposer, msg.sender);
    }

    function getTreaty(
        uint256 treatyId
    )
        external
        view
        returns (
            address proposer,
            address signer,
            string memory title,
            string memory counterparty,
            string memory terms,
            string memory stamp,
            uint256 createdAt,
            uint256 signedAt,
            bool accepted
        )
    {
        TreatyEntry storage entry = treaties[treatyId];
        return (
            entry.proposer,
            entry.signer,
            entry.title,
            entry.counterparty,
            entry.terms,
            entry.stamp,
            entry.createdAt,
            entry.signedAt,
            entry.accepted
        );
    }
}
