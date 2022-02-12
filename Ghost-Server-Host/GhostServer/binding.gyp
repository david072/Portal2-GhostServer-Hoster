{
    "targets": [
        {
            "target_name": "addon",
            "sources": ["./GhostServer/main_node.cpp", "./GhostServer/networkmanager.cpp"],
            "libraries": ["-lsfml-network", "-lsfml-system", "-lpthread"],
        }
    ]
}
