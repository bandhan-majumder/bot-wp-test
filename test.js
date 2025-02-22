const changes =  [
    {
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "15551440874",
          "phone_number_id": "572643735931375"
        },
        "contacts": [
          {
            "profile": {
              "name": "Shoyo"
            },
            "wa_id": "918617284049"
          }
        ],
        "messages": [
          {
            "from": "918617284049",
            "id": "wamid.HBgMOTE4NjE3Mjg0MDQ5FQIAEhggM0M0NjBFQkJBOEJCM0NBRjIwRTg0QTM3NDlBNkNGRjkA",
            "timestamp": "1740221653",
            "text": {
              "body": "Hi"
            },
            "type": "text"
          }
        ]
      },
      "field": "messages"
    }
  ]
  
  console.log(changes[0].value.messages[0].text.body)
  console.log(changes[0].value.messages[0].from)
  console.log(changes[0].value.contacts[0].profile.name)
