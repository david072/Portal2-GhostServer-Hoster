#include <node.h>
#include <string>
#include <iostream>
#include <future>

#include "GhostServer/GhostServer/networkmanager.h"

static NetworkManager g_network;

#define NODE_FUNC(name)                                                                                                                           \
    v8::Local<v8::Value> name##_callback(v8::Isolate *isolate, v8::Local<v8::Context> &context, const v8::FunctionCallbackInfo<v8::Value> &args); \
    void name(const v8::FunctionCallbackInfo<v8::Value> &args)                                                                                    \
    {                                                                                                                                             \
        auto *isolate = args.GetIsolate();                                                                                                        \
        auto context = isolate->GetCurrentContext();                                                                                              \
        auto return_value = name##_callback(isolate, context, args);                                                                              \
        args.GetReturnValue().Set(return_value);                                                                                                  \
    }                                                                                                                                             \
    v8::Local<v8::Value> name##_callback(v8::Isolate *isolate, v8::Local<v8::Context> &context, const v8::FunctionCallbackInfo<v8::Value> &args)

#define nodeStringLiteral(str) v8::String::NewFromUtf8Literal(isolate, str)

std::string toCppString(v8::Isolate *isolate, v8::MaybeLocal<v8::String> str)
{
    v8::String::Utf8Value utf8Value(isolate, str.ToLocalChecked());
    return std::string(*utf8Value);
}

void scheduleServerThreadAndWait(std::function<void()> func) {
    std::promise<void> promise;

    g_network.ScheduleServerThread([&]() {
        func();
        promise.set_value();
    });

    promise.get_future().wait();
}


NODE_FUNC(startServer)
{
    int port = 53000;
    if (args.Length() == 1 && !args[0]->IsUndefined())
    {
        port = args[0].As<v8::Number>()->IntegerValue(context).ToChecked();
    }

    g_network.StartServer(port);
    return v8::String::NewFromUtf8(isolate, sf::IpAddress::getPublicAddress().toString().c_str()).ToLocalChecked();
}

NODE_FUNC(exit)
{
    g_network.StopServer();
    return nodeStringLiteral("Server stopped!");
}

NODE_FUNC(list)
{
    auto result = v8::Array::New(isolate, g_network.clients.size());

    // Return empty list
    if (g_network.clients.empty())
        return result;

    for (size_t i = 0; i < g_network.clients.size(); i++)
    {
        auto &client = g_network.clients.at(i);

        auto templ = v8::ObjectTemplate::New(isolate);
        templ->Set(isolate, "id", v8::Number::New(isolate, client.ID));
        templ->Set(isolate, "name", v8::String::NewFromUtf8(isolate, client.name.c_str()).ToLocalChecked());
        templ->Set(isolate, "isSpectator", v8::Boolean::New(isolate, client.spectator));

        result->Set(context, i, templ->NewInstance(context).ToLocalChecked()).Check();
    }

    return result;
}

NODE_FUNC(startCountdown)
{
    if (args.Length() != 3)
        return v8::Undefined(isolate);

    auto _preCommands = args[0];
    if (!_preCommands->IsString())
        return v8::Undefined(isolate);

    auto _postCommands = args[1];
    if (!_postCommands->IsString())
        return v8::Undefined(isolate);

    auto _duration = args[2];
    if (!_duration->IsNumber())
        return v8::Undefined(isolate);

    auto preCommands = toCppString(isolate, _preCommands->ToString(context));
    auto postCommands = toCppString(isolate, _postCommands->ToString(context));
    auto duration = _duration->NumberValue(context).ToChecked();

    g_network.ScheduleServerThread([=]
                                   { g_network.StartCountdown(preCommands, postCommands, duration); });

    return v8::Undefined(isolate);
}

NODE_FUNC(serverMessage)
{
    if (args.Length() != 1)
        return v8::Exception::TypeError(nodeStringLiteral("One argument required"));

    auto _message = args[0];
    if (!_message->IsString())
        return v8::Exception::TypeError(nodeStringLiteral("First argument must be a string"));

    auto message = toCppString(isolate, _message->ToString(context));
    g_network.ServerMessage(message.c_str());

    return v8::Undefined(isolate);
}

NODE_FUNC(disconnect)
{
    if (args.Length() != 1) return v8::Undefined(isolate);
    if (!args[0]->IsString()) return v8::Undefined(isolate);

    auto playerName = toCppString(isolate, args[0]->ToString(context));

    scheduleServerThreadAndWait([=]() {
        auto players = g_network.GetPlayerByName(playerName);
        for (auto cl : players)
            g_network.DisconnectPlayer(*cl, "kicked");
    });

    return v8::Undefined(isolate);
}

NODE_FUNC(disconnectId)
{
    if (args.Length() != 1) return v8::Undefined(isolate);
    if (!args[0]->IsNumber()) return v8::Undefined(isolate);

    auto clientId = args[0]->NumberValue(context).ToChecked();

    scheduleServerThreadAndWait([=] {
        auto cl = g_network.GetClientByID(clientId);
        if (cl) g_network.DisconnectPlayer(*cl, "kicked");
    });

    return v8::Undefined(isolate);
}

NODE_FUNC(ban)
{
    if (args.Length() != 1) return v8::Undefined(isolate);
    if (!args[0]->IsString()) return v8::Undefined(isolate);

    std::string playerName = toCppString(isolate, args[0]->ToString(context));

    scheduleServerThreadAndWait([=]() {
        auto players = g_network.GetPlayerByName(playerName);
        for (auto cl : players)
            g_network.BanClientIP(cl->IP);
    });

    return v8::Undefined(isolate);
}

NODE_FUNC(banId)
{
    if (args.Length() != 1) return v8::Undefined(isolate);
    if (!args[0]->IsNumber()) return v8::Undefined(isolate);

    auto clientId = args[0]->NumberValue(context).ToChecked();

    scheduleServerThreadAndWait([=] {
        auto cl = g_network.GetClientByID(clientId);
        if (cl) g_network.BanClientIP(cl->IP);
    });

    return v8::Undefined(isolate);
}

NODE_FUNC(setAcceptingPlayers)
{
    if (args.Length() != 1) return v8::Undefined(isolate);
    if (!args[0]->IsBoolean()) return v8::Undefined(isolate);

    bool accept = args[0]->BooleanValue(isolate);

    scheduleServerThreadAndWait([=]() {
        g_network.acceptingPlayers = accept;
    });

    return v8::Undefined(isolate);
}

NODE_FUNC(getAcceptingPlayers)
{
    return v8::Boolean::New(isolate, g_network.acceptingPlayers);
}

NODE_FUNC(setAcceptingSpectators)
{
    if (args.Length() != 1) return v8::Undefined(isolate);
    if (!args[0]->IsBoolean()) return v8::Undefined(isolate);

    bool accept = args[0]->BooleanValue(isolate);

    scheduleServerThreadAndWait([=]() {
        g_network.acceptingSpectators = accept;
    });

    return v8::Undefined(isolate);
}

NODE_FUNC(getAcceptingSpectators)
{
    return v8::Boolean::New(isolate, g_network.acceptingSpectators);
}

NODE_FUNC(getWhitelist)
{
    auto whitelistTempl = v8::ObjectTemplate::New(isolate);
    whitelistTempl->Set(isolate, "enabled", v8::Boolean::New(isolate, g_network.whitelistEnabled));

    auto whitelistEntries = v8::Array::New(isolate, g_network.whitelist.size());

    if (!g_network.whitelist.empty())
    {
        size_t i = 0;
        for (auto it = g_network.whitelist.begin(); it != g_network.whitelist.end(); it++)
        {
            auto templ = v8::ObjectTemplate::New(isolate);
            templ->Set(isolate, "type", v8::String::NewFromUtf8(isolate, (*it).type == WhitelistEntryType::NAME ? "name" : "ip").ToLocalChecked());
            templ->Set(isolate, "value", v8::String::NewFromUtf8(isolate, (*it).value.c_str()).ToLocalChecked());

            whitelistEntries->Set(context, i, templ->NewInstance(context).ToLocalChecked()).Check();
            ++i;
        }
    }

    auto whitelist =  whitelistTempl->NewInstance(context).ToLocalChecked();
    whitelist->Set(context, nodeStringLiteral("entries"), static_cast<v8::Local<v8::Value>>(whitelistEntries));
    return whitelist;
}

NODE_FUNC(setWhitelistEnabled)
{
    if (args.Length() != 1) return v8::Undefined(isolate);
    if (!args[0]->IsBoolean()) return v8::Undefined(isolate);

    auto enabled = args[0]->BooleanValue(isolate);
    g_network.whitelistEnabled = enabled;

    return v8::Undefined(isolate);
}

NODE_FUNC(addNameToWhitelist)
{
    if (args.Length() != 1) return v8::Undefined(isolate);
    if (!args[0]->IsString()) return v8::Undefined(isolate);

    auto name = toCppString(isolate, args[0]->ToString(context));

    scheduleServerThreadAndWait([&]() {
        g_network.whitelist.insert(WhitelistEntry{WhitelistEntryType::NAME, name});
    });

    return v8::Undefined(isolate);
}

NODE_FUNC(addIpToWhitelist)
{
    if (args.Length() != 1) return v8::Undefined(isolate);
    if (!args[0]->IsString()) return v8::Undefined(isolate);

    auto ip = toCppString(isolate, args[0]->ToString(context));

    scheduleServerThreadAndWait([=]() {
        g_network.whitelist.insert(WhitelistEntry{WhitelistEntryType::IP, ip});
    });

    return v8::Undefined(isolate);
}

NODE_FUNC(removeNameFromWhitelist)
{
    if (args.Length() != 1) return v8::Undefined(isolate);
    if (!args[0]->IsString()) return v8::Undefined(isolate);

    auto name = toCppString(isolate, args[0]->ToString(context));

    scheduleServerThreadAndWait([=]() {
        g_network.whitelist.erase(WhitelistEntry{WhitelistEntryType::NAME, name});
    });

    return v8::Undefined(isolate);
}

NODE_FUNC(removeIpFromWhitelist)
{
    if (args.Length() != 1) return v8::Undefined(isolate);
    if (!args[0]->IsString()) return v8::Undefined(isolate);

    auto ip = toCppString(isolate, args[0]->ToString(context));

    scheduleServerThreadAndWait([=]() {
        g_network.whitelist.erase(WhitelistEntry{WhitelistEntryType::IP, ip});
    });

    return v8::Undefined(isolate);
}

void Initialize(v8::Local<v8::Object> exports)
{
    NODE_SET_METHOD(exports, "list", list);

    NODE_SET_METHOD(exports, "startServer", startServer);
    NODE_SET_METHOD(exports, "exit", exit);

    NODE_SET_METHOD(exports, "startCountdown", startCountdown);
    NODE_SET_METHOD(exports, "serverMessage", serverMessage);

    NODE_SET_METHOD(exports, "disconnect", disconnect);
    NODE_SET_METHOD(exports, "disconnectId", disconnectId);

    NODE_SET_METHOD(exports, "ban", ban);
    NODE_SET_METHOD(exports, "banId", banId);

    NODE_SET_METHOD(exports, "setAcceptingPlayers", setAcceptingPlayers);
    NODE_SET_METHOD(exports, "getAcceptingPlayers", getAcceptingPlayers);

    NODE_SET_METHOD(exports, "setAcceptingSpectators", setAcceptingSpectators);
    NODE_SET_METHOD(exports, "getAcceptingSpectators", getAcceptingSpectators);

    NODE_SET_METHOD(exports, "getWhitelist", getWhitelist);
    NODE_SET_METHOD(exports, "setWhitelistEnabled", setWhitelistEnabled);
    NODE_SET_METHOD(exports, "addNameToWhitelist", addNameToWhitelist);
    NODE_SET_METHOD(exports, "addIpToWhitelist", addIpToWhitelist);
    NODE_SET_METHOD(exports, "removeNameFromWhitelist", removeNameFromWhitelist);
    NODE_SET_METHOD(exports, "removeIpFromWhitelist", removeIpFromWhitelist);
}

NODE_MODULE(p2_ghost_server, Initialize)
