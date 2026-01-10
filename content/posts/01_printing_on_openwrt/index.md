---
title: "Printing on OpenWRT"
date: "2026-01-10"
description: "How I connected my old HP LaserJet M1005 printer to OpenWRT 24.10"
tags: ["openwrt", "p910nd", "cups", "printing"]
# ShowToc: false
# ShowBreadCrumbs: false
---

{{< figure
  src="./printer.webp"
  alt="HP LaserJet M1005 Printer"
  caption="My HP LaserJet M1005 printer"
  class="align-center text-center border"
>}}

## First attempt - naive setup

OpenWRT Wiki [has a great article](https://openwrt.org/docs/guide-user/services/print_server/p910nd.server) about print servers. This article describes how to setup **p910nd** daemon on the router and how to connect our client device to it.

This article also describes how to find a firmware for the printer and how to upload it using `hotplug.d`. My printer (HP LaserJet M1005) luckily doesn't needs any firmware upload.


### Setting up p910nd daemon on the router
> Spoiler: this setup doesn't worked for me

Firstly, you should install **p910nd** and USB kernel modules on your router:
```bash
root@router:~# opkg update

root@router:~# opkg install kmod-usb-printer kmod-lp p910nd luci-app-p9
```

Then I've configured p910nd through the web interface of my router like this in *Services -> p910nd Printer Server* section:

{{< figure
  src="./openwrt_config.png"
  alt="OpenWRT p910nd configuration page"
  caption="Adding new printer on p910nd page"
  class="align-center text-center border"
>}}


In the result, complete configuration file looks like this:
```properties
# /etc/config/p910nd

config hotplug
        option driver_home '/opt/p910nd_drivers'

config p910nd
        option enabled '1'
        option device '/dev/usb/lp0'
        option port '1'
        option bind '192.168.55.1'
        option usbvidpid '03f0/3b17'
        option mdns_sn 'KJ1QBA7'
        option bidirectional '1'
        option mdns_cls 'PRINTER'
        option mdns_mfg 'Hewlett-Packard'
        option mdns_note 'Located near router'
        option mdns '1'
        option mdns_mdl 'HP LaserJet M1005'
        option mdns_cmd 'ACL'
        option mdns_ty 'HP LaserJet M1005'
        option mdns_product '(HP LaserJet M1005)'
```
I've restarted my service using `service p910nd restart`, re-plugged my printer and saw the following lines in the router logs:
```
Sat Jan 10 11:28:12 2026 daemon.info p910nd hotplug: No driver file: /opt/p910nd_drivers/Hewlett-Packard_HP_LaserJet_M1005_03f0_3b17.bin for /dev/usb/lp0 [ 03f0/3b17 ] (upload it if your printer needs a driver loading).
Sat Jan 10 11:28:12 2026 daemon.info p910nd hotplug: (Re)starting p910nd
```

### Configuring Windows client

Then I've setted up my printer on the Windows 11 machine like it was described on the [OpenWRT wiki page](https://openwrt.org/docs/guide-user/services/print_server/p910nd.server):
> -  Click on the Start button and select Devices and Printers.
> -  Click on “Add a printer.”
> -  In the Add Printer dialog select “Add a local printer.”
> -  Select “Create a new port:” and set the type of port to “Standard TCP/IP Port”. Then click Next.
> - In the “Hostname or IP address:” field enter the IP address of your router.
> - The “Port name:” field may be set to something you like.
> - De-select “Query the printer and automatically select the driver to use,” then click next.
> - The computer will then attempt to detect the TCP/IP port. This will take some time and will most likely fail. Failing this step is not a problem.
> - On the “Additional port information required” page set the device type to Custom and click “Settings...”
> - Verify the Printer Name or IP Address. The Protocol should be set to “Raw” and the Raw Settings Port Number should be `9101` (or which you've specified). Leave LPR Settings and SNMP Status Enabled empty or de-selected. Then click OK.
> - Select the correct printer driver and click next. You may need to install drivers if they are not already available.
> - Finish the remaining printer installation wizard steps as needed. The printer should now be installed and working!

Aaand...

Yeah, it worked until it didn't. I have successfully printed one test page and then my printer stopped responding, all next print jobs failed.

## Attempt #2 - compiling CUPS

Long story short: it is a hassle to compile CUPS for the OpenWRT. There are many CUPS versions (2.x works with cups-filters, 3.x has completely different architecture and requires Printing Applications instead of drivers). I've successfully compiled CUPS for my **GL.iNet Flint 2 (MT6000)** router, but it wasn't enough:
* PDF-XChange printed successfully, but Google Chrome was not
* Files with unicode in filenames or with long names haven't printed due to the bugs in outdated CUPS 2.x version that I've compiled
* I haven't succeeded to install drivers on the router itself, so I still had to install printer driver on the client machines

## Attempt #3 - Hybrid approach

After [tinkering with OpenWRT compilation](https://github.com/maksimkurb/openwrt-builder) for several days, I've understood the following:
* `p910nd` print server is just a raw USB-to-TCP socket for my printer, it doesn't knows how to communicate with the printer and reads RAW signals.
  * `p910nd` is available for my router from official OpenWRT repos, no compilation hassle
* `CUPS` on the other hand knows how to communicate with my printer. It requires drivers which I can install on my linux machine and I can work with my printer from any client without needing to install any drivers to them (any Generic PostScript drivers are enough).
* I have Windows client with the WSL (Windows subsystem for Linux) installed

Then I've got an idea:
> Why can't I just install CUPS on my Windows client and point it to the p910nd raw socket?

And I can!

So long story short what I did:

### 1. Setting up p910nd daemon on the router
This process is [the same as in my first attempt](#setting-up-p910nd-daemon-on-the-router), no differences at all.

### 2. Setting up CUPS on my WSL
I have WSL 2 installed on my Windows PC with Ubuntu 24.04. I don't want to describe the process how you can install it here, you can find [good guides](https://documentation.ubuntu.com/wsl/stable/howto/install-ubuntu-wsl2/) in the Internet.

Then I've installed CUPS and printer drivers from Ubuntu repositories:
```bash
max@max-pc:~$ sudo apt update

# Installing CUPS
max@max-pc:~$ sudo apt install cups

# Adding CUPS to autostart
max@max-pc:~$ sudo systemctl enable --now cups

# Installing universal drivers for HP printers
max@max-pc:~$ sudo apt install hplip

# Adding user 'max' to the lpadmin group for CUPS management
max@max-pc:~$ sudo usermod -aG lpadmin max

# Installing proprietary HP drivers (follow the instructions of this wizard)
max@max-pc:~$ sudo hp-plugin -i
```

### 3. Adding printer to CUPS

I went to the CUPS administation page ([http://localhost:631/](http://localhost:631)) and added my printer:

{{< figure
  src="./cups-01.png"
  alt="CUPS add printer page"
  caption="Adding new HP printer using HPLIP driver"
  class="align-center text-center border"
>}}

Then I've provided `socket://192.168.55.1:9101` as the connection URL to point my CUPS to the p910nd socket.
{{< figure
  src="./cups-02.png"
  alt="CUPS configure printer address page"
  caption="Configuring socket address"
  class="align-center text-center border"
>}}

I've used `HP_LaserJet_M1005` as my printer name and checked a checkbox to share this printer just in case.
{{< figure
  src="./cups-03.png"
  alt="CUPS configure printer name page"
  caption="Setting printer name (must be without spaces, so I use underscores)"
  class="align-center text-center border"
>}}

On the next steps, I've chosen `HP` manufacturer and `HP LaserJet m1005, hpcups 3.21.12, requires proprietary plugin` driver for my printer and clicked **Add Printer**.

When printer was created, I can copy URL from my browser and use it to configure my Windows client.
In my case, URL was `http://localhost:631/printers/HP_LaserJet_M1005`.
{{< figure
  src="./cups-04.png"
  alt="CUPS printer page"
  caption="Printer administration page"
  class="align-center text-center border"
>}}

### 4. Adding printer to Windows Client

As I've already installed **hplip** drivers on my CUPS server in WSL, I do not need to install these drivers again on my Windows client. Any Generic PostScript (PS) drivers should work fine.

So I've downloaded [HP Universal Print Driver for Windows - Postscript](https://support.hp.com/us-en/drivers/hp-universal-print-driver-series-for-windows/model/503550), extracted them into folder and added my printer using these steps:

1. Open **Settings**
2. Go to **Bluetooth & Devices** -> **Printers & Scanners**
3. Click **Add device** and wait a bit until app shows "The printer that I want isn't listed" row
4. Click **Add a new device manually**
  ![Add a new device manually button](./windows-01.png)
5. In the dialog select **Select a shared printer by name** and enter CUPS URL to the printer (`http://localhost:631/printers/HP_LaserJet_M1005` in my case), click **Next**
  ![Add a printer dialog](./windows-02.png)
6. On the driver selection page click **Have Disk** button
  ![Select driver dialog](./windows-03.png)
7. Enter path to your unpacked PostScript drivers and click **OK**
  ![Provide path to the drivers](./windows-04.png)
8. Select your PostScript driver and finish printer setup.
  ![Select PostScript drivers](./windows-05.png)

    > If your printer manufacturer doesn't provide separate PostScript drivers, you can try selecting **Microsoft PS Class Driver** or try any driver from your manufacturer that has `PS` (PostScript) in it's name:
    > ![Select Microsoft Generic PostScript drivers](./windows-04-alt.png)
    > As a last resort if it didn't work, try using non-PS driver for your printer, but then maybe installing drivers into the WSL was meaningless and you can try to skip this step next time.
    

9. You're done! Printer is added and you can print test page.

Keep in mind that after Windows reboot you should start your WSL instance to boot CUPS server, otherwise printer wouldn't work.
