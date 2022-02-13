{
    "targets": [
        {
            "target_name": "addon",
            "sources": ["./main_node.cpp", "./GhostServer/GhostServer/networkmanager.cpp"],
            "libraries": ["-lsfml-network", "-lsfml-system", "-lpthread"],
        }
    ]
}
