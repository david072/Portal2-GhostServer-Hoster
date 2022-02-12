#include <node.h>
#include <string>
#include <iostream>

#include "networkmanager.h"

static NetworkManager g_network;

#define NODE_FUNC(name)                                                                                                                           \
    v8::Local<v8::Value> name##_callback(v8::Isolate* isolate, v8::Local<v8::Context>& context, const v8::FunctionCallbackInfo<v8::Value>& args); \
    void name(const v8::FunctionCallbackInfo<v8::Value>& args)                                                                                    \
    {                                                                                                                                             \
        auto* isolate = args.GetIsolate();                                                                                                        \
        auto context = isolate->GetCurrentContext();                                                                                              \
        auto return_value = name##_callback(isolate, context, args);                                                                              \
        args.GetReturnValue().Set(return_value);                                                                                                  \
    }                                                                                                                                             \
    v8::Local<v8::Value> name##_callback(v8::Isolate* isolate, v8::Local<v8::Context>& context, const v8::FunctionCallbackInfo<v8::Value>& args)

#define nodeStringLiteral(str) v8::String::NewFromUtf8(isolate, str).ToLocalChecked()

NODE_FUNC(startServer)
{
    int port = 53000;
    if (args.Length() == 1 && !args[0]->IsUndefined()) {
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

    for (size_t i = 0; i < g_network.clients.size(); i++) {
        auto& client = g_network.clients.at(i);

        // auto obj = v8::Object::New(isolate);
        // v8::PropertyDescriptor idDescriptor(v8::Integer::New(isolate, client.ID));
        // v8::PropertyDescriptor nameDescriptor(v8::String::NewFromUtf8(isolate, client.name.c_str()).ToLocalChecked());

        auto templ = v8::ObjectTemplate::New(isolate);
        templ->Set(isolate, "id", v8::Number::New(isolate, client.ID));
        templ->Set(isolate, "name", v8::String::NewFromUtf8(isolate, client.name.c_str()).ToLocalChecked());

        // obj->DefineProperty(context, nodeStringLiteral("id"), idDescriptor).Check();
        // obj->DefineProperty(context, nodeStringLiteral("name"), nameDescriptor).Check();

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

    v8::String::Utf8Value utf8PreCommands(isolate, _preCommands->ToString(context).ToLocalChecked());
    v8::String::Utf8Value utf8PostCommands(isolate, _postCommands->ToString(context).ToLocalChecked());
    std::string preCommands(*utf8PreCommands);
    std::string postCommands(*utf8PostCommands);

    auto duration = _duration->NumberValue(context).ToChecked();

    g_network.ScheduleServerThread([=] {
        g_network.StartCountdown(preCommands, postCommands, duration);
    });

    return v8::Undefined(isolate);
}

NODE_FUNC(disconnect)
{
    if (args.Length() != 1)
        return v8::Undefined(isolate);

    auto name = args[0];
    if (!name->IsString())
        return v8::Undefined(isolate);

    v8::String::Utf8Value utf8Value(isolate, name->ToString(context).ToLocalChecked());
    std::string playerName(*utf8Value);

    g_network.ScheduleServerThread([=]() {
        auto players = g_network.GetPlayerByName(playerName);
        for (auto cl : players)
            g_network.DisconnectPlayer(*cl, "kicked");
    });

    return v8::Undefined(isolate);
}

NODE_FUNC(disconnectId)
{
    if (args.Length() != 1) 
        return v8::Undefined(isolate);

    auto id = args[0];
    if (!id->IsNumber())
        return v8::Undefined(isolate);

    auto clientId = id->NumberValue(context).ToChecked();

    g_network.ScheduleServerThread([=] {
        auto cl = g_network.GetClientByID(clientId);
        if (cl) g_network.DisconnectPlayer(*cl, "kicked");
    });

    return v8::Undefined(isolate);
}

NODE_FUNC(ban)
{
    if (args.Length() != 1)
        return v8::Undefined(isolate);

    auto name = args[0];
    if (!name->IsString()) {
        return v8::Undefined(isolate);
    }

    v8::String::Utf8Value utf8Value(isolate, name->ToString(context).ToLocalChecked());
    std::string playerName(*utf8Value);

    g_network.ScheduleServerThread([=]() {
        auto players = g_network.GetPlayerByName(playerName);
        for (auto cl : players)
            g_network.BanClientIP(*cl); 
    });

    return v8::Undefined(isolate);
}

NODE_FUNC(banId)
{
    if (args.Length() != 1)
        return v8::Undefined(isolate);

    auto id = args[0];
    if (!id->IsNumber())
        return v8::Undefined(isolate);

    auto clientId = id->NumberValue(context).ToChecked();

    g_network.ScheduleServerThread([=] {
        auto cl = g_network.GetClientByID(clientId);
        if (cl) g_network.BanClientIP(*cl);
    });

    return v8::Undefined(isolate);
}

void Initialize(v8::Local<v8::Object> exports)
{
    NODE_SET_METHOD(exports, "list", list);

    NODE_SET_METHOD(exports, "startServer", startServer);
    NODE_SET_METHOD(exports, "exit", exit);

    NODE_SET_METHOD(exports, "startCountdown", startCountdown);

    NODE_SET_METHOD(exports, "disconnect", disconnect);
    NODE_SET_METHOD(exports, "disconnectId", disconnectId);

    NODE_SET_METHOD(exports, "ban", ban);
    NODE_SET_METHOD(exports, "banId", banId);
}

NODE_MODULE(p2_ghost_server, Initialize)